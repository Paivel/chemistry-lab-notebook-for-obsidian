---
cssclasses:
  - wide-page
auto-view-mode: preview
---
# Created last 7 days
```dataview

table file.cday

from "Journal acid" or "Journal"

where file.ctime > (date(now) - dur(7 days))

sort file.ctime desc

```


