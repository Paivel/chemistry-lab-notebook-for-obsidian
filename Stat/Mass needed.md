---
cssclasses:
  - wide-page
auto-view-mode: preview
---
<font size=6><b>Productoz</b></font>
```dataview
TABLE WITHOUT ID 
	file.link,
	pic,
	NMR,
	Mass_id

FROM "Journal"
WHERE Mass_id = empty  and filter(file.tasks, (t) => contains(t.text, "productoz") AND t.completed)
SORT id asc
```


<font size=6><b>Acid triazene</b></font>

```dataview
TABLE WITHOUT ID 
	file.link,
	pic,
	NMR,
	Mass_id
	
FROM "Journal"
WHERE Mass_id = empty  and filter(file.tasks, (t) => contains(t.text, "acidtriazene") AND t.completed)

```

<font size=6><b>Amination</b></font> 

```dataview
TABLE WITHOUT ID 
	file.link,
	pic,
	NMR,
	Mass_id
FROM "Journal"
WHERE Mass_id = empty  and filter(file.tasks, (t) => contains(t.text, "productamination") AND t.completed)

```
