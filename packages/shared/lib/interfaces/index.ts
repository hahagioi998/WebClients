export * from './Address';
export * from './Api';
export * from './ApiEnvironmentConfig';
export * from './Checklist';
export * from './Domain';
export * from './EncryptionPreferences';
export * from './Hotkeys';
export * from './Key';
export * from './KeySalt';
export * from './Label';
export * from './MailSettings';
export * from './Member';
export * from './Organization';
export * from './OrganizationKey';
export * from './Payment';
export * from './Referrals';
export * from './SignedKeyList';
export * from './Subscription';
export * from './User';
export * from './UserSettings';
export * from './VPN';
export * from './config';
export * from './utils';

export interface EncryptionConfig {
    curve?: string;
    numBits?: number;
}

export type HumanVerificationMethodType =
    | 'captcha'
    | 'payment'
    | 'sms'
    | 'email'
    | 'invite'
    | 'coupon'
    | 'ownership-email'
    | 'ownership-sms';
