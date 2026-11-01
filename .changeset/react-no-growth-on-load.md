---
'keystone-dashboard-layout-react': patch
---

Stop items growing into place when a server-rendered grid hydrates. The items are in the DOM at a placeholder width until the container is measured, and the first measured layout then ran their width transition from that placeholder to the real size. The grid root now carries `data-kdl-settling` until it has been painted once at its measured width (two animation frames), and the stylesheet turns the items' transitions off while it is there.
