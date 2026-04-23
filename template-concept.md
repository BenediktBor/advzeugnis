# Template Concept

How template sentences are supposed to work.

Only privileged users are allowed to edit template sentences per school.

There is one set of templates for each year: Klasse 1, Klasse 2, Klasse 3, Klasse 4.
Templates are stored within a server side database later (do not implement yet, use idb-keyval for now).

Each set of sentences consists of multiple subjects and a list of subcategories.
Each subcategory then has a sentence per grade level.
There may be multiple sentence variants per grade level.

Sentences are stored as an array of multiple parts with different types:

- type: text -> Simple text element
- type: genderVariant -> array selecting male or female form depending on genderVariant
- type: name -> Fills in name (without surname)

## Example

```javascript
{
    label: 'Klasse 1',
    subjects: [
        {
            label: 'Mathe',
            categories: [
                {
                    label: 'Raumorientierung',
                    grades: [
                        {
                            label: '1',
                            variants: [
                                {
                                    label: '1',
                                    sentences: [
                                        {
                                            type: 'genderVariant',
                                            value: ['Er', 'Sie']
                                        },
                                        {
                                            type: 'text',
                                            value: 'hat ein sehr fortgeschrittenes Verständnis für Räume und Zahlen.'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
```

## Editing

Templates can be edited in the following way:

Dashboard Panel 1:

Tree View (Could we use UTreeView for this?)

- Create completely new templates or delete them like students work right now (copy over).
- Create new subjects
- Create new categories per subject

Dashboard Panel 2:

- Create the grade levels for the currently selected category within panel 1
- Create variants for the currently active grade levels
