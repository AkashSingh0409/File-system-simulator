const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Tree Data Structure ────────────────────────────────────────────────────
// Each node: { id, name, type: 'folder'|'file', children: [], parentId }
// Root is a special folder named "Home"

let fileSystem = {
  id: 'root',
  name: 'Home',
  type: 'folder',
  parentId: null,
  children: [
    {
      id: uuidv4(),
      name: 'Documents',
      type: 'folder',
      parentId: 'root',
      children: [
        { id: uuidv4(), name: 'Resume.pdf', type: 'file', parentId: null, children: [] },
        { id: uuidv4(), name: 'Notes.txt', type: 'file', parentId: null, children: [] },
      ]
    },
    {
      id: uuidv4(),
      name: 'Pictures',
      type: 'folder',
      parentId: 'root',
      children: [
        { id: uuidv4(), name: 'Vacation.jpg', type: 'file', parentId: null, children: [] },
        { id: uuidv4(), name: 'Profile.png', type: 'file', parentId: null, children: [] },
      ]
    },
    {
      id: uuidv4(),
      name: 'Projects',
      type: 'folder',
      parentId: 'root',
      children: [
        {
          id: uuidv4(),
          name: 'WebApp',
          type: 'folder',
          parentId: null,
          children: [
            { id: uuidv4(), name: 'index.html', type: 'file', parentId: null, children: [] },
            { id: uuidv4(), name: 'style.css', type: 'file', parentId: null, children: [] },
          ]
        }
      ]
    },
    { id: uuidv4(), name: 'README.md', type: 'file', parentId: 'root', children: [] },
  ]
};

// Fix parentIds recursively after init
function fixParentIds(node, parentId) {
  node.parentId = parentId;
  if (node.children) {
    node.children.forEach(child => fixParentIds(child, node.id));
  }
}
fixParentIds(fileSystem, null);

// ─── DFS: Find node by ID ────────────────────────────────────────────────────
function findById(node, id) {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// ─── DFS: Find parent of a node ─────────────────────────────────────────────
function findParent(node, targetId) {
  if (node.children) {
    for (const child of node.children) {
      if (child.id === targetId) return node;
      const found = findParent(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

// ─── BFS: Search by name (returns all matches with full path) ────────────────
function bfsSearch(root, query) {
  const results = [];
  const q = [{ node: root, path: [] }];

  while (q.length > 0) {
    const { node, path } = q.shift();
    const currentPath = [...path, node.name];

    if (node.name.toLowerCase().includes(query.toLowerCase()) && node.id !== 'root') {
      results.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: currentPath.join(' / '),
        parentId: node.parentId,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        q.push({ node: child, path: currentPath });
      }
    }
  }
  return results;
}

// ─── DFS: Build full path ────────────────────────────────────────────────────
function getFullPath(root, targetId) {
  function dfs(node, path) {
    const currentPath = [...path, node.name];
    if (node.id === targetId) return currentPath;
    if (node.children) {
      for (const child of node.children) {
        const found = dfs(child, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
  const pathArr = dfs(root, []);
  return pathArr ? pathArr.join(' / ') : null;
}

// ─── Serialize for frontend (strips internal refs, adds path) ───────────────
function serialize(node, root) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: node.parentId,
    path: getFullPath(root, node.id),
    children: node.children ? node.children.map(c => serialize(c, root)) : [],
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET entire tree
app.get('/api/tree', (req, res) => {
  res.json(serialize(fileSystem, fileSystem));
});

// GET single node
app.get('/api/node/:id', (req, res) => {
  const node = findById(fileSystem, req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });
  res.json(serialize(node, fileSystem));
});

// POST create node
app.post('/api/node', (req, res) => {
  const { parentId, name, type } = req.body;
  if (!parentId || !name || !type) return res.status(400).json({ error: 'Missing fields' });

  const parent = findById(fileSystem, parentId);
  if (!parent) return res.status(404).json({ error: 'Parent not found' });
  if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent must be a folder' });

  // Check duplicate names
  if (parent.children.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Name already exists in this folder' });
  }

  const newNode = {
    id: uuidv4(),
    name,
    type,
    parentId,
    children: [],
  };

  parent.children.push(newNode);
  res.status(201).json(serialize(newNode, fileSystem));
});

// PUT rename node
app.put('/api/node/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const node = findById(fileSystem, req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });
  if (node.id === 'root') return res.status(400).json({ error: 'Cannot rename root' });

  const parent = findParent(fileSystem, node.id);
  if (parent && parent.children.some(c => c.id !== node.id && c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Name already exists in this folder' });
  }

  node.name = name;
  res.json(serialize(node, fileSystem));
});

// DELETE node
app.delete('/api/node/:id', (req, res) => {
  const id = req.params.id;
  if (id === 'root') return res.status(400).json({ error: 'Cannot delete root' });

  const parent = findParent(fileSystem, id);
  if (!parent) return res.status(404).json({ error: 'Node not found' });

  parent.children = parent.children.filter(c => c.id !== id);
  res.json({ success: true });
});

// PUT move node (drag & drop)
app.put('/api/node/:id/move', (req, res) => {
  const { newParentId } = req.body;
  const id = req.params.id;

  if (id === 'root') return res.status(400).json({ error: 'Cannot move root' });
  if (id === newParentId) return res.status(400).json({ error: 'Cannot move into itself' });

  const node = findById(fileSystem, id);
  const newParent = findById(fileSystem, newParentId);
  if (!node || !newParent) return res.status(404).json({ error: 'Node not found' });
  if (newParent.type !== 'folder') return res.status(400).json({ error: 'Target must be a folder' });

  // Prevent moving into a descendant (DFS check)
  function isDescendant(ancestor, targetId) {
    if (!ancestor.children) return false;
    for (const child of ancestor.children) {
      if (child.id === targetId) return true;
      if (isDescendant(child, targetId)) return true;
    }
    return false;
  }
  if (isDescendant(node, newParentId)) {
    return res.status(400).json({ error: 'Cannot move folder into its own descendant' });
  }

  if (newParent.children.some(c => c.name.toLowerCase() === node.name.toLowerCase())) {
    return res.status(409).json({ error: 'Name already exists in target folder' });
  }

  const oldParent = findParent(fileSystem, id);
  oldParent.children = oldParent.children.filter(c => c.id !== id);
  node.parentId = newParentId;
  newParent.children.push(node);

  res.json(serialize(fileSystem, fileSystem));
});

// GET search (BFS)
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const results = bfsSearch(fileSystem, q);
  res.json(results);
});

const PORT = 3001;
app.get("/", (req, res) => {
  res.send("File System API is running 🚀");
});
app.listen(PORT, () => console.log(`File System API running on http://localhost:${PORT}`));
