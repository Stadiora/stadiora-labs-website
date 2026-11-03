import { addOns, usd } from '../../data/prices';

/** The custom-branded app fee, formatted from the price table. Shown in the add-ons strip and in its dialog. */
export const brandedFee = {
  values: { monthly: usd(addOns.brandedApp.monthly), setup: usd(addOns.brandedApp.setup) },
  // Each amount gets a marker so the evidence checks can read it where it shows.
  marks: { monthly: { 'data-price': 'branded-monthly' }, setup: { 'data-price': 'branded-setup' } },
};
