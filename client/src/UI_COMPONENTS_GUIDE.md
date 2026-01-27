# UI Components Guide

This guide explains how to use the new user-friendly UI components across all modules.

## Available Components

### Button Component
Located at: `client/src/components/ui/Button.js`

```jsx
import { Button } from "../components/ui";

// Variants: primary, secondary, success, danger, warning, outline, ghost, link
// Sizes: xs, sm, md, lg, xl

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

<Button variant="success" loading={isLoading} disabled={isDisabled}>
  Save
</Button>
```

### Input Component
Located at: `client/src/components/ui/Input.js`

```jsx
import { Input } from "../components/ui";

<Input
  label="Email Address"
  type="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  helperText="Enter your email address"
/>
```

### Select Component
Located at: `client/src/components/ui/Select.js`

```jsx
import { Select } from "../components/ui";

<Select
  label="Category"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  required
>
  <option value="">Select Category</option>
  <option value="option1">Option 1</option>
</Select>
```

### Card Component
Located at: `client/src/components/ui/Card.js`

```jsx
import { Card } from "../components/ui";

<Card padding="md" shadow="sm" hover>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

### Badge Component
Located at: `client/src/components/ui/Badge.js`

```jsx
import { Badge } from "../components/ui";

<Badge variant="success" size="md">Active</Badge>
<Badge variant="danger">Inactive</Badge>
```

### PageHeader Component
Located at: `client/src/components/PageHeader.js`

```jsx
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui";

<PageHeader
  title="Expenses"
  description="Manage and track your business expenses"
  actions={[
    <Button key="add" variant="primary">Add Expense</Button>,
    <Button key="export" variant="outline">Export</Button>
  ]}
/>
```

## Enhanced Components

### MetricCard
Now supports trends and improved styling:

```jsx
<MetricCard
  label="Total Sales"
  value="AED 50,000"
  icon={<Icon />}
  accent="bg-emerald-100"
  trend={12.5}
  trendLabel="vs last month"
/>
```

### EmptyState
Now supports icons and better layout:

```jsx
<EmptyState
  title="No expenses found"
  description="Start by adding your first expense"
  icon={<Icon />}
  action={<Button>Add Expense</Button>}
/>
```

## CSS Utility Classes

Global CSS classes are available in `client/src/index.css`:

- `.page-container` - Centered page container with max-width
- `.section-header` - Header for sections
- `.section-title` - Main section title (text-2xl font-bold)
- `.section-description` - Section description text
- `.form-section` - Form container with spacing
- `.form-grid` - Two-column form grid
- `.table-container` - Styled table container
- `.table` - Enhanced table styling
- `.card-grid` - Responsive card grid layout

## Usage Examples

### Example 1: Form Page

```jsx
import PageHeader from "../components/PageHeader";
import { Button, Input, Select, Card } from "../components/ui";

export default function MyPage() {
  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="My Page"
        description="Description of the page"
        actions={<Button variant="primary">Add New</Button>}
      />
      
      <Card padding="md">
        <form className="form-section">
          <div className="form-grid">
            <Input label="Name" required />
            <Select label="Category" required>
              <option value="">Select...</option>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline">Cancel</Button>
            <Button variant="primary">Save</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
```

### Example 2: Table View

```jsx
import { Card, Badge, Button } from "../components/ui";

<div className="table-container">
  <table className="table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Item 1</td>
        <td><Badge variant="success">Active</Badge></td>
        <td>
          <Button variant="ghost" size="sm">Edit</Button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## Migration Guide

To update existing pages:

1. Replace manual button styles with `<Button>` component
2. Replace input fields with `<Input>` component
3. Replace select fields with `<Select>` component
4. Wrap sections in `<Card>` components
5. Use `<PageHeader>` for page titles
6. Use utility classes for consistent spacing and layout

## Design Principles

- **Consistency**: All components follow the same design language
- **Accessibility**: Proper labels, focus states, and keyboard navigation
- **Responsiveness**: Mobile-first design with responsive breakpoints
- **Visual Hierarchy**: Clear typography scales and spacing
- **Feedback**: Loading states, error states, and success indicators
