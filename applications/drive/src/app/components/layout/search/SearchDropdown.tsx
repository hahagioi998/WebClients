import * as React from 'react';
import { c } from 'ttag';

import { Button, Dropdown, Loader } from '@proton/components';
import { DRIVE_APP_NAME } from '@proton/shared/lib/constants';

import './SearchDropdown.scss';

interface Props {
    isOpen: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    onClose: () => void;
    onClosed: () => void;
}

export const SearchDropdown = ({ isOpen, anchorRef, onClose, onClosed }: Props) => {
    return (
        <>
            <Dropdown
                anchorRef={anchorRef as React.RefObject<HTMLElement>}
                isOpen={isOpen}
                originalPlacement="bottom-left"
                autoClose={false}
                autoCloseOutside={true}
                noMaxSize
                onClose={onClose}
                onClosed={onClosed}
                className="dropdown-content--wide advanced-search-dropdown search-dropdown"
                disableDefaultArrowNavigation
                UNSTABLE_AUTO_HEIGHT
            >
                <div className="pl1-5 pr1-5 pt1-5 pb1">
                    <div className="flex">
                        <div className="flex">
                            <Loader className="inline-flex" />
                            <span className="inline-flex ml1 text-bold">{c('Label').t`Enabling drive search`}</span>
                        </div>
                        <p className="mb0">
                            {c('Info')
                                .t`To enable truly private search ${DRIVE_APP_NAME} needs to index your files locally. You can still use ${DRIVE_APP_NAME} normally - we’ll let you know when indexing is done.`}
                        </p>
                    </div>
                    <div className="flex flex-justify-end mt1">
                        <Button type="submit" onClick={onClose}>{c('Action').t`Got it`}</Button>
                    </div>
                </div>
            </Dropdown>
        </>
    );
};
