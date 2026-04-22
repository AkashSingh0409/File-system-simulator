# File System Simulator

A full-stack web application simulating a hierarchical file system using tree data structures and graph traversal algorithms.

## Project Structure

```
file-system-simulator/
├── backend/
│   ├── server.js       ← Express API + tree logic + DFS/BFS
│   └── package.json
└── frontend/
    └── index.html      ← Full UI (vanilla JS, no build step)
```

## Setup & Run

### 1. Start Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:3001
```

### 2. Open Frontend
```bash
# Simply open frontend/index.html in your browser
# (or serve with any static file server)
open frontend/index.html
```

---

## Algorithms Used

### 1. DFS — Depth First Search
**Used for:** Finding nodes by ID, computing full paths, validating move operations.

```
findById(root, targetId):
  if root.id == targetId → return root
  for each child of root:
    found = findById(child, targetId)
    if found → return found
  return null
```

DFS is ideal here because we need to locate a specific node and stop immediately when found — we don't need to visit all nodes. It also uses less memory than BFS for deep trees.

### 2. BFS — Breadth First Search
**Used for:** Search functionality (finding files/folders by name).

```
bfsSearch(root, query):
  queue = [(root, [])]
  results = []
  while queue not empty:
    (node, path) = dequeue
    if node.name contains query → add to results with full path
    enqueue all children with updated path
  return results
```

BFS ensures results are returned in breadth-order (shallower nodes first), which feels natural in a file explorer — top-level matches appear before deeply nested ones. It also naturally computes the full path as it traverses.

---

## REST API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/api/tree`           | Full file system tree              |
| GET    | `/api/node/:id`       | Single node details                |
| POST   | `/api/node`           | Create file or folder              |
| PUT    | `/api/node/:id`       | Rename node                        |
| DELETE | `/api/node/:id`       | Delete node (recursive)            |
| PUT    | `/api/node/:id/move`  | Move node (drag & drop)            |
| GET    | `/api/search?q=term`  | BFS search across all nodes        |

---

## Features

- Tree sidebar with expand/collapse
- Double-click folders to navigate into them
- Breadcrumb navigation (Home › Folder › Subfolder)
- Create, rename, delete files and folders
- Drag & drop to move items between folders
- BFS-powered real-time search with path display
- Info panel showing full path of selected item
- File type icons based on extension
