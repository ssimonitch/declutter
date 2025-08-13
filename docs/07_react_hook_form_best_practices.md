# React Hook Form & Zod Schema Best Practices

## Overview

This document summarizes the best practices for using React Hook Form (v7+) with Zod schema validation, based on the refactoring work done on the SuzuMemo/Declutter application's form system.

## Table of Contents

1. [Single Source of Truth](#single-source-of-truth)
2. [When to Use register vs Controller](#when-to-use-register-vs-controller)
3. [Type Safety Best Practices](#type-safety-best-practices)
4. [Number Input Handling](#number-input-handling)
5. [Array Field Management](#array-field-management)
6. [Performance Optimizations](#performance-optimizations)
7. [Common Anti-Patterns to Avoid](#common-anti-patterns-to-avoid)

## Single Source of Truth

### ✅ Best Practice: Define Schema Once

Create a single Zod schema that serves as the source of truth for both validation and TypeScript types:

```typescript
// lib/schemas/item.schema.ts
import { z } from "zod";

// Define the schema
export const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().int().min(1).max(999),
  price: z.object({
    low: z.number().min(0),
    high: z.number().min(0),
    confidence: z.number().min(0).max(1),
  }),
  tags: z.array(z.string()).default([]),
  notes: z.string().nullable().default(null),
});

// Derive types from schema
export type ItemFormData = z.infer<typeof itemFormSchema>;
export type ItemFormInput = z.input<typeof itemFormSchema>;

// Default values function
export const getDefaultFormValues = (): ItemFormData => ({
  name: "",
  quantity: 1,
  price: { low: 0, high: 0, confidence: 0.5 },
  tags: [],
  notes: null,
});
```

### Benefits

- Single place to update validation rules
- TypeScript types automatically stay in sync
- Reduces duplication and potential inconsistencies

## When to Use register vs Controller

### Use `register` When:

- Working with native HTML inputs (`<input>`, `<select>`, `<textarea>`)
- No custom value transformation needed
- No need to access current value for UI logic
- Simple validation that Zod can handle

```typescript
// ✅ Good for simple inputs
<input {...register("name")} />
<select {...register("category")} />
<textarea {...register("description")} />

// ✅ Good for number inputs
<input
  {...register("quantity", { valueAsNumber: true })}
  type="number"
  min="1"
/>
```

### Use `Controller` When:

- Building custom components (custom radio groups, complex selects)
- Need access to field state for conditional rendering
- Complex value transformations beyond `valueAsNumber`
- Third-party UI components

```typescript
// ✅ Good use of Controller - Custom radio group
<Controller
  name="action"
  control={control}
  render={({ field }) => (
    <div>
      {options.map(option => (
        <label
          className={field.value === option.value ? 'selected' : ''}
        >
          <input
            type="radio"
            {...field}
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </div>
  )}
/>
```

## Type Safety Best Practices

### Avoid Type Coercion

```typescript
// ❌ Bad - Type coercion
const form = useForm<FormData>({
  resolver: zodResolver(schema) as any,
});

// ✅ Good - Proper typing
import { Resolver } from "react-hook-form";

const form = useForm<FormData>({
  resolver: zodResolver(schema) as Resolver<FormData>,
});
```

### Use Proper Form Component Props

```typescript
// ✅ Best practice - Pass form object
interface FormSectionProps {
  form: UseFormReturn<ItemFormData>;
}

const FormSection: React.FC<FormSectionProps> = ({ form }) => {
  const {
    register,
    formState: { errors },
  } = form;
  // ...
};
```

## Number Input Handling

### Common Problem: Can't Delete Number Values

```typescript
// ❌ Bad - Prevents deletion
<Controller
  name="quantity"
  render={({ field }) => (
    <input
      type="number"
      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
    />
  )}
/>
```

### Solutions

#### Option 1: Use register with valueAsNumber

```typescript
// ✅ Good - Allows temporary empty state
<input
  {...register("quantity", {
    valueAsNumber: true,
    min: { value: 1, message: "Must be at least 1" }
  })}
  type="number"
  min="1"
/>
```

#### Option 2: Custom setValueAs for Nullable Numbers

```typescript
// ✅ Good for optional numbers
<input
  {...register("price", {
    valueAsNumber: true,
    setValueAs: (v) => (v === "" || isNaN(v) ? null : Number(v))
  })}
  type="number"
/>
```

## Array Field Management

### Controlled Array Inputs

```typescript
// ✅ Good - Controlled array input with proper value/onChange
const ArrayField: React.FC<{ form: UseFormReturn<FormData> }> = ({ form }) => {
  const { setValue } = form;

  const tags = useWatch({
    control: form.control,
    name: "tags",
  });

  const handleChange = (value: string) => {
    const items = value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
    setValue("tags", items, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <input
      type="text"
      value={tags?.join(", ") || ""}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Enter tags, separated by commas"
    />
  );
};
```

## Performance Optimizations

### 1. Use Selective Watching

```typescript
// ❌ Bad - Watches entire form
const formValues = watch();

// ✅ Good - Watch specific fields
const selectedAction = useWatch({
  control,
  name: "recommendedAction",
});
```

### 2. Prefer onBlur Mode for Large Forms

```typescript
// ✅ Good for performance
const form = useForm({
  mode: "onBlur", // Validates on blur instead of every change
  resolver: zodResolver(schema),
});
```

### 3. Memoize Complex Components

```typescript
// ✅ Good - Prevent unnecessary re-renders
const ExpensiveComponent = memo(
  ({ form }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison if needed
    return prevProps.form === nextProps.form;
  },
);
```

### 4. Use Blob URL Management Hook

```typescript
// ✅ Good - Proper cleanup prevents memory leaks
const useBlobPreview = (blob: Blob | undefined) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;

    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);

    return () => URL.revokeObjectURL(blobUrl);
  }, [blob]);

  return url;
};
```

## Common Anti-Patterns to Avoid

### 1. Manual setValue in onChange

```typescript
// ❌ Bad - Manual setValue operations
const updateField = (field: string, value: any) => {
  setValue(field, value);
};

// ✅ Good - Use register for simple cases
<input {...register("field")} />
```

### 2. Uncontrolled Inputs with defaultValue

```typescript
// ❌ Bad - Uncontrolled outside of RHF
<input
  defaultValue={item?.value}
  onChange={(e) => handleChange(e.target.value)}
/>

// ✅ Good - Controlled with RHF
<input {...register("field")} />
// OR
<input
  value={watch("field")}
  onChange={(e) => setValue("field", e.target.value)}
/>
```

### 3. Watching Entire Form Unnecessarily

```typescript
// ❌ Bad - Re-renders on every field change
useEffect(() => {
  const subscription = watch((value) => {
    console.log(value);
  });
  return () => subscription.unsubscribe();
}, [watch]);

// ✅ Good - Watch specific fields
const fieldValue = useWatch({ control, name: "specificField" });
```

### 4. Type Assertions in Constants

```typescript
// ❌ Bad - Scattered type assertions
const ACTION_CONFIG = {
  keep: {
    value: "keep" as const,
    label: "Keep",
  },
};

// ✅ Good - Single source of truth
const ACTIONS = ["keep", "sell", "donate"] as const;
type ActionType = (typeof ACTIONS)[number];

type ActionConfig = {
  [K in ActionType]: { value: K; label: string };
};
```

## Summary of Key Principles

1. **Single Source of Truth**: Define schemas once, derive types from them
2. **Right Tool for the Job**: Use `register` for simple inputs, `Controller` for complex ones
3. **Type Safety**: Avoid `as any`, use proper TypeScript patterns
4. **Performance**: Use selective watching, onBlur validation, and memoization
5. **User Experience**: Allow temporary invalid states during editing, validate on blur/submit
6. **Clean Code**: Keep form logic in custom hooks, components focused on presentation

## Migration Checklist

When refactoring existing forms:

- [ ] Create unified Zod schema
- [ ] Generate TypeScript types from schema
- [ ] Replace manual setValue with register where possible
- [ ] Fix number inputs that prevent deletion
- [ ] Convert uncontrolled inputs to controlled
- [ ] Use useWatch instead of watch() for selective subscriptions
- [ ] Add proper error boundaries and validation messages
- [ ] Test all edge cases (empty fields, invalid input, etc.)

## References

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook - Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
