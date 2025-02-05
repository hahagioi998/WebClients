import loudRejection from 'loud-rejection';
import { fireEvent, getByText } from '@testing-library/dom';
import { screen } from '@testing-library/react';
import { MAILBOX_LABEL_IDS } from '@proton/shared/lib/constants';
import {
    addApiMock,
    clearAll,
    getDropdown,
    getHistory,
    render,
    minimalCache,
    addToCache,
    tick,
} from '../../helpers/test/helper';
import { Breakpoints } from '../../models/utils';
import MailHeader from './MailHeader';

loudRejection();

const getProps = () => ({
    labelID: 'labelID',
    elementID: undefined,
    location: getHistory().location,
    history: getHistory(),
    breakpoints: {} as Breakpoints,
    onSearch: jest.fn(),
    expanded: true,
    onToggleExpand: jest.fn(),
    onOpenShortcutsModal: jest.fn(),
});

const user = {
    Email: 'Email',
    DisplayName: 'DisplayName',
    Name: 'Name',
    hasPaidMail: false,
    UsedSpace: 10,
    MaxSpace: 100,
};

describe('MailHeader', () => {
    let props: ReturnType<typeof getProps>;

    const setup = async () => {
        minimalCache();
        addToCache('User', user);
        addApiMock('payments/plans', () => ({}));
        addApiMock('contacts/v4/contacts', () => ({ Contacts: [] }));

        props = getProps();

        const result = await render(<MailHeader {...props} />, false);
        const search = result.getByTitle('Search');

        const openSearch = async () => {
            fireEvent.click(search);
            await tick();
            const overlay = document.querySelector('div[role="dialog"].overlay') as HTMLDivElement;
            const submitButton = overlay.querySelector('button[type="submit"]') as HTMLButtonElement;
            const submit = () => fireEvent.click(submitButton);
            return { overlay, submitButton, submit };
        };

        return { ...result, openSearch };
    };

    // Not found better to test
    // It's hard to override sso mode constant
    const assertAppLink = (element: HTMLElement, href: string) => {
        const link = element.closest('a');
        expect(link?.getAttribute('href')).toBe(href);
    };

    afterEach(clearAll);

    describe('Core features', () => {
        it('should redirect on inbox when click on logo', async () => {
            const { getByText } = await setup();
            const logo = getByText('ProtonMail');
            fireEvent.click(logo);

            const history = getHistory();
            expect(history.length).toBe(1);
            expect(history.location.pathname).toBe('/inbox');
        });

        it('should open app dropdown', async () => {
            const { getByTitle } = await setup();

            const appsButton = getByTitle('Proton applications');
            fireEvent.click(appsButton);

            const dropdown = await getDropdown();

            getByText(dropdown, 'Mail');
            getByText(dropdown, 'Calendar');
            getByText(dropdown, 'VPN');
        });

        it('should open contacts widget', async () => {
            const { getByText: getByTextHeader } = await setup();

            const contactsButton = getByTextHeader('Contacts');
            fireEvent.click(contactsButton);

            const dropdown = await getDropdown();
            getByText(dropdown, 'Contacts');
            getByText(dropdown, 'Groups');
            getByText(dropdown, 'Settings');
        });

        it('should open settings', async () => {
            const { getByText: getByTextHeader } = await setup();

            const settingsButton = getByTextHeader('Settings');
            fireEvent.click(settingsButton);

            const dropdown = await getDropdown();
            const settingsLink = getByText(dropdown, 'settings', { exact: false });

            assertAppLink(settingsLink, '/mail');
        });

        it('should open user dropdown', async () => {
            const { getByText: getByTextHeader } = await setup();

            const userButton = getByTextHeader(user.DisplayName);
            fireEvent.click(userButton);

            const dropdown = await getDropdown();
            const { textContent } = dropdown;

            expect(textContent).toContain('Proton introduction');
            expect(textContent).toContain('Get help');
            expect(textContent).toContain('Proton shop');
            expect(textContent).toContain('Sign out');
        });

        it('should show upgrade button', async () => {
            const { getByText } = await setup();

            const upgradeLabel = getByText('Upgrade');

            assertAppLink(upgradeLabel, '/mail/dashboard');
        });

        it('should show upgrade button', async () => {
            const { getByText } = await setup();

            const upgradeLabel = getByText('Upgrade');

            assertAppLink(upgradeLabel, '/mail/dashboard');
        });
    });

    describe('Search features', () => {
        it('should search with keyword', async () => {
            const searchTerm = 'test';

            const { getByTestId, openSearch, rerender } = await setup();
            const { submit } = await openSearch();

            const keywordInput = document.getElementById('search-keyword') as HTMLInputElement;
            fireEvent.change(keywordInput, { target: { value: searchTerm } });

            submit();

            const history = getHistory();
            expect(history.length).toBe(2);
            expect(history.location.pathname).toBe('/all-mail');
            expect(history.location.hash).toBe(`#keyword=${searchTerm}`);

            await rerender(<MailHeader {...props} />);

            const searchKeyword = getByTestId('search-keyword');
            expect(searchKeyword.textContent).toBe(searchTerm);
        });

        it('should search with keyword and location', async () => {
            const searchTerm = 'test';

            const { openSearch } = await setup();
            const { submit } = await openSearch();

            const keywordInput = document.getElementById('search-keyword') as HTMLInputElement;
            fireEvent.change(keywordInput, { target: { value: searchTerm } });

            const draftButton = screen.getByTestId(`location-${MAILBOX_LABEL_IDS.DRAFTS}`);
            fireEvent.click(draftButton);

            submit();

            const history = getHistory();
            expect(history.length).toBe(2);
            expect(history.location.pathname).toBe('/drafts');
            expect(history.location.hash).toBe(`#keyword=${searchTerm}`);
        });
    });
});
