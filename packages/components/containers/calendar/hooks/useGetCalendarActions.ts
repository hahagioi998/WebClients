import { getPersonalCalendars } from '@proton/shared/lib/calendar/calendar';
import { getMemberAndAddress } from '@proton/shared/lib/calendar/members';
import isTruthy from '@proton/shared/lib/helpers/isTruthy';
import { omit } from '@proton/shared/lib/helpers/object';
import { Dispatch, SetStateAction } from 'react';
import { CalendarCreateData } from '@proton/shared/lib/interfaces/calendar/Api';
import {
    CalendarNotificationSettings,
    CalendarSettings,
    SubscribedCalendar,
    VisualCalendar,
} from '@proton/shared/lib/interfaces/calendar';
import { getPrimaryKey } from '@proton/shared/lib/keys';
import { c } from 'ttag';
import {
    createCalendar,
    updateCalendar,
    updateCalendarSettings,
    updateCalendarUserSettings,
    updateMember,
} from '@proton/shared/lib/api/calendars';
import { loadModels } from '@proton/shared/lib/models/helper';
import { CalendarsModel } from '@proton/shared/lib/models';
import { setupCalendarKey } from '@proton/shared/lib/calendar/keys/setupCalendarKeys';
import {
    useApi,
    useCache,
    useEventManager,
    useGetAddresses,
    useGetAddressKeys,
    useNotifications,
    useReadCalendarBootstrap,
} from '../../../hooks';
import { useCalendarModelEventManager } from '../../eventManager';

const getHasChangedCalendarData = (calendarPayload: CalendarCreateData, calendar: VisualCalendar) => {
    const { Name: oldName, Description: oldDescription } = calendar;
    const { Name: newName, Description: newDescription } = calendarPayload;

    return oldName !== newName || oldDescription !== newDescription;
};

const getHasChangedCalendarMemberData = (
    memberID: string,
    calendarPayload: CalendarCreateData,
    calendar: VisualCalendar
) => {
    const oldIndex = calendar.Members.findIndex(({ ID }) => ID === memberID);
    if (oldIndex === -1) {
        // we should not fall in here. If we do, assume changes are needed
        return true;
    }
    const { Color: oldColor, Display: oldDisplay } = calendar.Members[oldIndex];
    const { Color: newColor, Display: newDisplay } = calendarPayload;

    return oldColor.toLowerCase() !== newColor.toLowerCase() || oldDisplay !== newDisplay;
};

const getHasChangedCalendarNotifications = (
    newNotifications: CalendarNotificationSettings[],
    oldNotifications: CalendarNotificationSettings[]
) => {
    return (
        newNotifications.length !== oldNotifications.length ||
        newNotifications.some(
            ({ Type: newType, Trigger: newTrigger }) =>
                !oldNotifications.find(
                    ({ Type: oldType, Trigger: oldTrigger }) => oldType === newType && oldTrigger === newTrigger
                )
        )
    );
};

const getHasChangedCalendarSettings = (
    newSettings: Required<
        Pick<CalendarSettings, 'DefaultEventDuration' | 'DefaultPartDayNotifications' | 'DefaultFullDayNotifications'>
    >,
    oldSettings?: CalendarSettings
) => {
    if (!oldSettings) {
        // we should not fall in here. If we do, assume changes are needed
        return true;
    }
    const {
        DefaultEventDuration: newDuration,
        DefaultPartDayNotifications: newPartDayNotifications,
        DefaultFullDayNotifications: newFullDayNotifications,
    } = newSettings;
    const {
        DefaultEventDuration: oldDuration,
        DefaultPartDayNotifications: oldPartDayNotifications,
        DefaultFullDayNotifications: oldFullDayNotifications,
    } = oldSettings;
    return (
        newDuration !== oldDuration ||
        getHasChangedCalendarNotifications(newPartDayNotifications, oldPartDayNotifications) ||
        getHasChangedCalendarNotifications(newFullDayNotifications, oldFullDayNotifications)
    );
};

interface Props {
    setCalendar: Dispatch<SetStateAction<VisualCalendar | undefined>>;
    setError: Dispatch<SetStateAction<boolean>>;
    defaultCalendarID?: string | null;
    onClose?: () => void;
    onCreateCalendar?: (id: string) => void;
    activeCalendars?: VisualCalendar[];
    isSubscribedCalendar?: boolean;
}

const useGetCalendarActions = ({
    setCalendar,
    setError,
    defaultCalendarID,
    onClose,
    onCreateCalendar,
    activeCalendars,
    isSubscribedCalendar = false,
}: Props) => {
    const api = useApi();
    const getAddresses = useGetAddresses();
    const { call } = useEventManager();
    const { call: calendarCall } = useCalendarModelEventManager();
    const cache = useCache();
    const getAddressKeys = useGetAddressKeys();
    const readCalendarBootstrap = useReadCalendarBootstrap();
    const { createNotification } = useNotifications();

    const handleCreateCalendar = async (
        addressID: string,
        calendarPayload: CalendarCreateData,
        calendarSettingsPayload: Partial<CalendarSettings>
    ) => {
        const addressKeys = await getAddressKeys(addressID);

        const { privateKey: primaryAddressKey } = getPrimaryKey(addressKeys) || {};
        if (!primaryAddressKey) {
            createNotification({ text: c('Error').t`Primary address key is not decrypted`, type: 'error' });
            setError(true);
            throw new Error('Missing primary key');
        }

        const {
            Calendar,
            Calendar: { ID: newCalendarID },
        } = await api<{ Calendar: SubscribedCalendar }>(
            createCalendar({
                ...calendarPayload,
                AddressID: addressID,
            })
        );

        await setupCalendarKey({
            api,
            calendarID: newCalendarID,
            addressID,
            getAddressKeys,
        }).catch((e: Error) => {
            // Hard failure if the keys fail to setup. Force the user to reload.
            setError(true);
            throw e;
        });

        onCreateCalendar?.(newCalendarID);
        // Set the calendar in case one of the following calls fails so that it ends up in the update function after this.
        setCalendar(Calendar);

        if (!isSubscribedCalendar) {
            await Promise.all([
                api(updateCalendarSettings(newCalendarID, calendarSettingsPayload)),
                (() => {
                    if (defaultCalendarID) {
                        return;
                    }
                    const personalActiveCalendars = getPersonalCalendars(activeCalendars);
                    const newDefaultCalendarID = personalActiveCalendars?.length
                        ? personalActiveCalendars[0].ID
                        : newCalendarID;
                    return api(updateCalendarUserSettings({ DefaultCalendarID: newDefaultCalendarID }));
                })(),
            ]).catch(() => {
                createNotification({
                    type: 'warning',
                    text: c('Settings update growler warning').t`Failed to update settings`,
                });
            });
        }

        // Refresh the calendar model in order to ensure flags are correct
        await loadModels([CalendarsModel], { api, cache, useCache: false });
        await call();

        onClose?.();

        createNotification({
            text: isSubscribedCalendar
                ? c('Success').t`Calendar added. It might take a few minutes to sync.`
                : c('Success').t`Calendar created`,
        });
    };

    const handleUpdateCalendar = async (
        calendar: VisualCalendar,
        calendarPayload: CalendarCreateData,
        calendarSettingsPayload: Required<
            Pick<
                CalendarSettings,
                'DefaultEventDuration' | 'DefaultPartDayNotifications' | 'DefaultFullDayNotifications'
            >
        >
    ) => {
        const calendarID = calendar.ID;
        const { Color, Display } = calendarPayload;
        const [{ ID: memberID }] = getMemberAndAddress(await getAddresses(), calendar.Members);
        const hasChangedCalendarData = getHasChangedCalendarData(calendarPayload, calendar);
        const hasChangedMemberData = getHasChangedCalendarMemberData(memberID, calendarPayload, calendar);
        const hasChangedSettings = getHasChangedCalendarSettings(
            calendarSettingsPayload,
            readCalendarBootstrap(calendarID)?.CalendarSettings
        );

        await Promise.all(
            [
                hasChangedCalendarData && api(updateCalendar(calendarID, omit(calendarPayload, ['Color', 'Display']))),
                hasChangedMemberData && api(updateMember(calendarID, memberID, { Display, Color })),
                hasChangedSettings && api(updateCalendarSettings(calendarID, calendarSettingsPayload)),
            ].filter(isTruthy)
        );

        await call();
        await calendarCall([calendarID]);

        onClose?.();

        createNotification({ text: c('Success').t`Calendar updated` });
    };

    return { handleCreateCalendar, handleUpdateCalendar };
};

export default useGetCalendarActions;
