import * as React from 'react';
import { c } from 'ttag';

import { Button, Icon } from '@proton/components';

interface InnerModalModalCloseButtonProps {
    onClose?: () => void;
    closeTextModal?: string;
}

const InnerModalModalCloseButton = ({ closeTextModal, onClose }: InnerModalModalCloseButtonProps) => {
    const closeText = closeTextModal || c('Action').t`Close modal`;

    return (
        <Button icon shape="ghost" size="small" className="inner-modal-close" title={closeText} onClick={onClose}>
            <Icon className="inner-modal-close-icon" name="xmark" alt={closeText} />
        </Button>
    );
};

export default InnerModalModalCloseButton;
