# Forms

Patterns for implementing forms with React Hook Form, Zod validation, multi-step forms, and various input states.

## Use When

- Building forms with validation
- Implementing multi-step wizards
- Handling complex form state
- Creating reusable form components
- Managing form submission states

---

## Setup

### Install Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
```

### Basic Form Structure

```tsx
// components/forms/user-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().min(18, 'Must be at least 18').optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>;
  defaultValues?: Partial<UserFormData>;
}

export function UserForm({ onSubmit, defaultValues }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const handleFormSubmit = async (data: UserFormData) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Age (optional)</Label>
        <Input
          id="age"
          type="number"
          placeholder="25"
          {...register('age')}
          aria-invalid={!!errors.age}
        />
        {errors.age && (
          <p className="text-sm text-destructive">{errors.age.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

---

## Form Field Components

### Reusable Form Field

```tsx
// components/forms/form-field.tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  description?: string;
  required?: boolean;
}

export function FormField({
  name,
  label,
  placeholder,
  type = 'text',
  description,
  required,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${name}-error` : description ? `${name}-description` : undefined
        }
        className={cn(error && 'border-destructive')}
      />

      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
}
```

### Form Provider Wrapper

```tsx
// components/forms/form-wrapper.tsx
'use client';

import { FormProvider, UseFormReturn } from 'react-hook-form';

interface FormWrapperProps<T extends Record<string, unknown>> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function FormWrapper<T extends Record<string, unknown>>({
  form,
  onSubmit,
  children,
  className,
}: FormWrapperProps<T>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}
```

---

## Validation Schemas

### Common Schema Patterns

```tsx
// lib/validations/schemas.ts
import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number'
  );

// Phone validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .optional()
  .or(z.literal(''));

// Date validation
export const dateSchema = z.coerce.date();

// File validation
export const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, 'File must be less than 5MB')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'File must be an image (JPEG, PNG, or WebP)'
  );
```

### Complex Schema Examples

```tsx
// lib/validations/user.ts
import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './schemas';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.enum(['user', 'admin', 'manager'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  phone: phoneSchema,
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(false),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update schema (partial, without password)
export const updateUserSchema = createUserSchema
  .omit({ password: true, confirmPassword: true })
  .partial();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

---

## Select and Radio Fields

### Select Field

```tsx
// components/forms/select-field.tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
}

export function SelectField({
  name,
  label,
  options,
  placeholder = 'Select...',
  required,
}: SelectFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger id={name} aria-invalid={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {error && (
        <p className="text-sm text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}
```

### Radio Group Field

```tsx
// components/forms/radio-field.tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface RadioFieldProps {
  name: string;
  label: string;
  options: Option[];
  required?: boolean;
}

export function RadioField({
  name,
  label,
  options,
  required,
}: RadioFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div className="space-y-3">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="space-y-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={option.value}
                  id={`${name}-${option.value}`}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      />

      {error && (
        <p className="text-sm text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}
```

---

## Checkbox and Switch Fields

### Checkbox Field

```tsx
// components/forms/checkbox-field.tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CheckboxFieldProps {
  name: string;
  label: string;
  description?: string;
}

export function CheckboxField({
  name,
  label,
  description,
}: CheckboxFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-start space-x-3">
          <Checkbox
            id={name}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor={name} className="cursor-pointer">
              {label}
            </Label>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      )}
    />
  );
}
```

### Switch Field

```tsx
// components/forms/switch-field.tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SwitchFieldProps {
  name: string;
  label: string;
  description?: string;
}

export function SwitchField({ name, label, description }: SwitchFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={name}>{label}</Label>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Switch
            id={name}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        </div>
      )}
    />
  );
}
```

---

## Multi-Step Forms

### Multi-Step Form Hook

```tsx
// lib/hooks/use-multi-step-form.ts
'use client';

import { useState, useCallback } from 'react';

export function useMultiStepForm(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  return {
    currentStep,
    totalSteps,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    progress: ((currentStep + 1) / totalSteps) * 100,
    nextStep,
    prevStep,
    goToStep,
    reset,
  };
}
```

### Multi-Step Form Component

```tsx
// components/forms/multi-step-form.tsx
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMultiStepForm } from '@/lib/hooks/use-multi-step-form';

// Step schemas
const step1Schema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
});

const step2Schema = z.object({
  company: z.string().min(2, 'Company is required'),
  role: z.string().min(2, 'Role is required'),
});

const step3Schema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms' }),
  }),
});

// Combined schema
const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormData = z.infer<typeof fullSchema>;

const stepSchemas = [step1Schema, step2Schema, step3Schema];

const steps = [
  { title: 'Personal Info', description: 'Your basic information' },
  { title: 'Work Details', description: 'Where do you work?' },
  { title: 'Plan Selection', description: 'Choose your plan' },
];

export function MultiStepForm() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
  } = useMultiStepForm(steps.length);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
  });

  const validateCurrentStep = async () => {
    const currentSchema = stepSchemas[currentStep];
    const fields = Object.keys(currentSchema.shape) as (keyof FormData)[];

    const isValid = await form.trigger(fields);
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    }
  };

  const handleSubmit = async (data: FormData) => {
    console.log('Form submitted:', data);
    // Submit to API
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="mb-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{steps[currentStep].title}</span>
        </div>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {steps[currentStep].description}
            </p>

            {currentStep === 0 && <Step1 />}
            {currentStep === 1 && <Step2 />}
            {currentStep === 2 && <Step3 />}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isFirstStep}
            >
              Previous
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

// Step components
function Step1() {
  return (
    <div className="space-y-4">
      <FormField name="firstName" label="First Name" required />
      <FormField name="lastName" label="Last Name" required />
      <FormField name="email" label="Email" type="email" required />
    </div>
  );
}

function Step2() {
  return (
    <div className="space-y-4">
      <FormField name="company" label="Company" required />
      <FormField name="role" label="Role" required />
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-4">
      <RadioField
        name="plan"
        label="Select Plan"
        required
        options={[
          { value: 'free', label: 'Free', description: 'Basic features' },
          { value: 'pro', label: 'Pro', description: 'Advanced features' },
          { value: 'enterprise', label: 'Enterprise', description: 'Full suite' },
        ]}
      />
      <CheckboxField
        name="agreeToTerms"
        label="I agree to the terms and conditions"
      />
    </div>
  );
}
```

---

## File Upload

### File Input Field

```tsx
// components/forms/file-field.tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileFieldProps {
  name: string;
  label: string;
  accept?: string;
  maxSize?: number; // in bytes
  required?: boolean;
}

export function FileField({
  name,
  label,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  required,
}: FileFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const [preview, setPreview] = useState<string | null>(null);
  const error = errors[name];

  const handleFileChange = useCallback(
    (file: File | null, onChange: (value: File | null) => void) => {
      if (file) {
        if (file.size > maxSize) {
          return; // Handle error
        }
        onChange(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        onChange(null);
        setPreview(null);
      }
    },
    [maxSize]
  );

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <div className="space-y-4">
            {preview ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => handleFileChange(null, onChange)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload
                </span>
                <Input
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleFileChange(file, onChange);
                  }}
                  {...field}
                />
              </label>
            )}
          </div>
        )}
      />

      {error && (
        <p className="text-sm text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}
```

---

## Form Arrays

### Dynamic Field Array

```tsx
// components/forms/field-array.tsx
'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface FieldArrayProps {
  name: string;
  label: string;
  addLabel?: string;
}

export function FieldArray({
  name,
  label,
  addLabel = 'Add item',
}: FieldArrayProps) {
  const { control, register, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const fieldErrors = errors[name] as { message?: string }[] | undefined;

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input
            {...register(`${name}.${index}.value`)}
            placeholder={`Item ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {fieldErrors?.[0]?.message && (
        <p className="text-sm text-destructive">{fieldErrors[0].message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ value: '' })}
      >
        <Plus className="h-4 w-4 mr-2" />
        {addLabel}
      </Button>
    </div>
  );
}
```

---

## Server Actions Forms

### Server Action Form

```tsx
// app/users/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
  };

  const validatedData = createUserSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      success: false,
      errors: validatedData.error.flatten().fieldErrors,
    };
  }

  // Create user in database
  await db.user.create({ data: validatedData.data });

  revalidatePath('/users');
  return { success: true };
}
```

```tsx
// app/users/create/page.tsx
'use client';

import { useFormState } from 'react-dom';
import { createUser } from '../actions';
import { SubmitButton } from '@/components/forms/submit-button';

const initialState = {
  success: false,
  errors: {},
};

export default function CreateUserPage() {
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
        {state.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email}</p>
        )}
      </div>

      <SubmitButton>Create User</SubmitButton>
    </form>
  );
}
```

---

## Best Practices

### 1. Colocate Schemas with Forms

```tsx
// Keep schema and form together
// components/forms/user-form/schema.ts
// components/forms/user-form/index.tsx
```

### 2. Use Controlled Components Sparingly

```tsx
// Good - uncontrolled with register
<Input {...register('name')} />

// Use Controller only when needed (third-party components)
<Controller
  name="select"
  control={control}
  render={({ field }) => <CustomSelect {...field} />}
/>
```

### 3. Validate on Blur for Better UX

```tsx
const form = useForm({
  mode: 'onBlur', // Validate on blur instead of onChange
});
```

### 4. Show Inline Errors

```tsx
// Good - error next to field
{errors.email && (
  <p className="text-sm text-destructive">{errors.email.message}</p>
)}

// Avoid - all errors at top
```

### 5. Disable Submit During Submission

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

---

## External Resources

- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [shadcn/ui Form](https://ui.shadcn.com/docs/components/form)
