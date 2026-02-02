import { createFileRoute } from '@tanstack/react-router'






import { useEffect } from 'react';
import {  useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
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


export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
  loader: async ({context}) => (
    await context.queryClient.ensureQueryData(settingsQueryOptions())
  ),
})

export function SettingsPage() {
  const queryClient = useQueryClient();


  const { data: settings, isLoading } = useSuspenseQuery(settingsQueryOptions());

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
  }, [settings, reset]); 

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
      </div >
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
                  id="emailFromName   "
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
