---
cssClass: wide-page
auto-view-mode: preview
---

```dataview
TABLE WITHOUT ID 
	file.link as N,
	date, 
	needed,
	description

FROM "Journal"
WHERE filter(file.tasks, (t) => contains(t.text, "finished") AND !t.completed)
SORT date asc

```


**Need to transfer to finished**
```dataview
TABLE WITHOUT ID 
	file.link as N,
	date, 
	needed,
	description

WHERE file.folder = "Journal/Example/IM"
WHERE filter(file.tasks, (t) => contains(t.text, "finished") AND t.completed)

```



