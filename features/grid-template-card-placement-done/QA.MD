# QA — Grid Template Card Placement

## Manual test cases

### Desktop card grid

- Open editor templates/cards UI on desktop width.
- Verify cards align to a clean grid.
- Verify preview/title/action placement is consistent.

### Responsive layout

- Resize editor/panel to smaller widths.
- Verify grid reflows without clipped cards.
- Verify no horizontal overflow.

### Card label readability

- Check short and long labels.
- Verify labels truncate/wrap according to existing design without hiding actions.

### No horizontal overflow

- Test asset panel and whole editor viewport.
- Confirm no unwanted page/panel horizontal scrollbar.

### Existing interactions still work

- Click existing template/card action.
- Verify existing apply/open/select behavior still works.
- Verify hover/focus states remain accessible.
