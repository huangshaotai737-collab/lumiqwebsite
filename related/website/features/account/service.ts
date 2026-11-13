import 'server-only';
import { createClient } from '@/lib/auth/server';
import { requireUser } from '@/lib/auth/require-user';
import { assertAccountBinding } from './identity-binding';
import { HttpError } from '@/lib/http/result';
import type { AccountIdentityBinding, ApiResult, Locale, Profile, ShippingAddress } from '@/lib/generated/platform/core';
// ISO 3166-1 alpha-2 assigned country/territory codes; aliases such as UK are excluded.
const countries = new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
export type ProfileInput = {
    displayName: string;
    locale: Locale;
    shippingAddress: ShippingAddress | null;
};
export function validateProfileInput(value: unknown): ProfileInput {
    if (!value || typeof value !== 'object')
        throw new HttpError('INVALID_INPUT', 400);
    const v = value as Record<string, unknown>;
    if (typeof v.displayName !== 'string' || v.displayName.length > 120 || /[\x00-\x1f\x7f]/.test(v.displayName) || !['en', 'zh-hant', 'ja'].includes(v.locale as string))
        throw new HttpError('INVALID_INPUT', 400);
    let shippingAddress: ShippingAddress | null = null;
    if (v.shippingAddress !== null) {
        if (!v.shippingAddress || typeof v.shippingAddress !== 'object' || Array.isArray(v.shippingAddress))
            throw new HttpError('INVALID_INPUT', 400);
        const a = v.shippingAddress as Record<string, unknown>;
        const limits = { name: 120, country: 2, region: 120, city: 120, postalCode: 32, line1: 500, line2: 500, phone: 40 };
        for (const [key, max] of Object.entries(limits))
            if (typeof a[key] !== 'string' || (a[key] as string).length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(a[key] as string) || (!['line1', 'line2'].includes(key) && /[\r\n\t]/.test(a[key] as string)))
                throw new HttpError('INVALID_INPUT', 400);
        if (!countries.has(a.country as string) || !['name', 'city', 'line1'].every(key => (a[key] as string).trim()))
            throw new HttpError('INVALID_INPUT', 400);
        shippingAddress = Object.fromEntries(Object.keys(limits).map(key => [key, a[key]])) as ShippingAddress;
    }
    return { displayName: v.displayName, locale: v.locale as Locale, shippingAddress };
}
function profile(row: {
    user_id: string;
    display_name: string;
    locale: string;
    shipping_address: unknown;
}): Profile {
    const safe = validateProfileInput({ displayName: row.display_name, locale: row.locale, shippingAddress: Object.keys(row.shipping_address as object).length ? row.shipping_address : null });
    return { userId: row.user_id, ...safe };
}
async function result(run: () => Promise<Profile>): Promise<ApiResult<Profile>> {
    try {
        return { ok: true, data: await run() };
    }
    catch (error) {
        return { ok: false, error: error instanceof HttpError ? error.code : 'UNAVAILABLE', requestId: crypto.randomUUID() };
    }
}
export async function getOwnProfile(): Promise<ApiResult<Profile>> {
    return result(async () => {
        const { userId } = await requireUser(), client = await createClient();
        const { data, error } = await client.from('profiles').select('user_id,display_name,locale,shipping_address').eq('user_id', userId).maybeSingle();
        if (error || !data)
            throw new HttpError('UNAVAILABLE', 503);
        return profile(data);
    });
}
export async function updateOwnProfile(input: ProfileInput & AccountIdentityBinding): Promise<ApiResult<Profile>> {
    return result(async () => {
        const { userId } = await requireUser();
        assertAccountBinding(input, userId);
        const value = validateProfileInput(input), client = await createClient();
        const { data, error } = await client.from('profiles').update({ display_name: value.displayName, locale: value.locale, shipping_address: value.shippingAddress ? { ...value.shippingAddress } : {} }).eq('user_id', userId).select('user_id,display_name,locale,shipping_address').maybeSingle();
        if (error || !data)
            throw new HttpError('UNAVAILABLE', 503);
        return profile(data);
    });
}
