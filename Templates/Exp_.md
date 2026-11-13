<%* let id1; id1 = await tp.user.idnext1(tp); try { await tp.file.rename("Exp_" + id1) } catch (e) { new Notice("Could not rename the note to Exp_" + id1 + ": " + e.message) } %>---
tags:
---
# Exp_<% id1 %> 

**Date**:: **{{date}}**
**id1**:: 00<% id1 %>
**Description**::

## Table
![[Click to draw the reaction.svg]]

**yield**::
**mass**::
**scale**::
**temperature**::
**time**::
**atmosphere**::
**other**::
**MW**::
**state**::
**num_in_article**::
**roles**::
**needed**::NMR, mass, yield

![[Exp_<% id1 %>.cdxml]]

## Procedure Exp_<% id1 %> 


**Ref** 

## TLC

Purification (for example, flash chromatography on silica gel):
**workup**::
**eluent**::

| TLC eluent EtOAc/Hex= : | after cc |     |
| ----------------------- | -------- | --- |
|                         |          |     |
|                         |          |     |

## Characterization

#### NMR
**NMR_id**::
**solvent**::
**frequency**:: 

![[Exp_<% id1 %>.mnova]]

```meta-bind-button
label: Add NMR
style: primary
action:
  type: command
  command: templater-obsidian:Templates/add_nmr.md
```
```meta-bind-button
label: Open in TopSpin
style: default
action:
  type: command
  command: nmr-downloader:open-note-in-topspin
```
#### MS
**Mass_id**::
**Mass_Ionization**::
**Mass_pic**::

[[Exp_<% id1 %>.pdf]]

```meta-bind-button
label: Add Mass
style: primary
action:
  type: command
  command: templater-obsidian:Templates/add_mass.md
```
#### X-Ray
**xraydesc**::
example: were obtained by slow evaporation of C6H6 solution
**files**::
## Description

nmr_description::n

**Name**::
**pic**::
**HNMR**::
**CNMR**::
**FNMR**::
**PNMR**::
**SiNMR**::
**DNMR**::
**BNMR**::
**15NNMR**::
**HRMS**::
[M+H]+ calcd for C25H2035Cl2N3+ 432.1029; found 432.1053.



```meta-bind-button
label: Finish
style: primary
action:
  type: command
  command: templater-obsidian:Templates/finish_note.md
```

![[Open CDX Editor.cdx]]



<div style="page-break-after: always;"></div>