import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { settingsQueryOptions } from '@/data/setting/fetch-setting';
import { UpdateSettings } from '@/lib/types';
import { PageHeader } from './clients';
import { CURRENCIES, PAYMENT_TERMS, TIMEZONES } from '@/lib/constant';
import { toast } from 'sonner';
import { updateSettingFn, updateSettingsSchema } from '@/data/setting/setting';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
  loader: async ({context}) => (
    await context.queryClient.ensureQueryData(settingsQueryOptions())
  ),
})

// Move uploadLogo function OUTSIDE the component
async function uploadLogo(formData: FormData) {
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSuspenseQuery(settingsQueryOptions());

  // Define uploadLogoMutation hook INSIDE the component
  const uploadLogoMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Logo updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload logo');
      console.error('Logo upload error:', error);
    },
  });

const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Invalid file type. Please use PNG, JPG, or SVG.');
    e.target.value = '';
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File size must be less than 2MB. Please choose a smaller image.');
    e.target.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('logo', file);
  uploadLogoMutation.mutate(formData);
  e.target.value = '';
}

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
    reset,
  } = useForm<UpdateSettings>({
    resolver: zodResolver(updateSettingsSchema),
  });

  useEffect(() => {
    if (settings) {
      reset({
        businessName: settings.businessName || '',
        businessEmail: settings.businessEmail || '',
        businessAddress: settings.businessAddress || '',
        defaultCurrency: settings.defaultCurrency as (typeof CURRENCIES)[number],
        defaultPaymentTerms: settings.defaultPaymentTerms as (typeof PAYMENT_TERMS)[number],
        timezone: settings.timezone as (typeof TIMEZONES)[number],
        emailFromName: settings.emailFromName || '',
        invoicePrefix: settings.invoicePrefix,
      });
    }
  }, [settings, reset]);  // Reset form values when settings data is loaded or updated

  const updateMutation = useMutation({
    mutationFn: updateSettingFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save settings');
    },
  });

  const onSubmit = (data: UpdateSettings) => {
    updateMutation.mutate({data:data});
  };

  if (isLoading) {
    return (
      <div className='bg-background lg:pl-5'>
        <PageHeader title="Settings" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-background lg:pl-5'>
      <PageHeader
        title="Settings"
        description="Manage your business profile and preferences"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              This information will appear on your invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  {...register('businessName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  placeholder="hello@yourbusiness.com"
                  {...register('businessEmail')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                placeholder="Street address, city, country..."
                rows={3}
                {...register('businessAddress')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Defaults</CardTitle>
            <CardDescription>
              Default settings for new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select
                  value={watch('defaultCurrency')}
                  onValueChange={(value) => setValue('defaultCurrency', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Payment Terms</Label>
                <Select
                  value={watch('defaultPaymentTerms')}
                  onValueChange={(value) => setValue('defaultPaymentTerms', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  placeholder="INV"
                  maxLength={10}
                  {...register('invoicePrefix')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload Section */}
            <div className="flex flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage src={settings?.logoUrl || ''} className="object-cover" />
                  <AvatarFallback className="text-2xl">
                    {settings?.businessName?.slice(0, 2).toUpperCase() || 'BZ'}
                  </AvatarFallback>
                </Avatar>
                
                {uploadLogoMutation.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="logo-upload" className="font-medium">
                  Company Logo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    className="w-full max-w-62.5 cursor-pointer"
                    onChange={handleLogoUpload}
                    disabled={uploadLogoMutation.isPending}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Max size 2MB. Formats: PNG, JPG, SVG.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={watch('timezone')}
                  onValueChange={(value) => setValue('timezone', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailFromName">Email From Name</Label>
                <Input
                  id="emailFromName"
                  placeholder="Your name or business name"
                  {...register('emailFromName')}
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear as the sender in invoice emails
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            {(isSubmitting || updateMutation.isPending) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
