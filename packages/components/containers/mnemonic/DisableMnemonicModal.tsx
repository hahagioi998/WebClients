import { useState, FormEvent } from 'react';
import { c } from 'ttag';
import { disableMnemonicPhrase } from '@proton/shared/lib/api/settingsMnemonic';
import { getApiError } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import { PASSWORD_WRONG_ERROR } from '@proton/shared/lib/api/auth';
import { noop } from '@proton/shared/lib/helpers/function';
import { srpAuth } from '@proton/shared/lib/srp';

import {
    AlertModal,
    ModalProps,
    Button,
    Loader,
    ModalTwo as Modal,
    ModalTwoHeader as ModalHeader,
    ModalTwoContent as ModalContent,
    ModalTwoFooter as ModalFooter,
} from '../../components';
import { useApi, useEventManager, useNotifications } from '../../hooks';
import { PasswordTotpInputs, useAskAuth } from '../password';

enum STEPS {
    CONFIRM,
    AUTH,
}

interface DisableMnemonicModalProps {
    onClose: ModalProps['onClose'];
    onExit: ModalProps['onExit'];
    open: ModalProps['open'];
}

const DisableMnemonicModal = ({ open, onClose, onExit }: DisableMnemonicModalProps) => {
    const [step, setStep] = useState(STEPS.CONFIRM);
    const [submittingAuth, setSubmittingAuth] = useState(false);
    const [password, setPassword] = useState('');
    const [totp, setTotp] = useState('');

    const [hasTOTPEnabled, isLoadingAuth] = useAskAuth();
    const { createNotification } = useNotifications();
    const { call } = useEventManager();
    const api = useApi();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            setSubmittingAuth(true);

            await srpAuth({
                api,
                credentials: { password, totp },
                config: disableMnemonicPhrase(),
            });

            await call();
            onClose?.();
            createNotification({ text: c('Info').t`Recovery phrase has been disabled` });
        } catch (error: any) {
            const { code } = getApiError(error);
            setSubmittingAuth(false);
            if (code !== PASSWORD_WRONG_ERROR) {
                onClose?.();
            }
        }
    };

    if (step === STEPS.CONFIRM) {
        return (
            <AlertModal
                open={open}
                title={c('Action').t`Disable recovery phrase?`}
                buttons={[
                    <Button color="danger" onClick={() => setStep(STEPS.AUTH)}>
                        {c('Action').t`Disable recovery phrase`}
                    </Button>,
                    <Button onClick={onClose}>{c('Action').t`Cancel`}</Button>,
                ]}
                onClose={onClose}
                onExit={onExit}
            >
                <p className="mt0">{c('Info')
                    .t`This will disable your current recovery phrase. You won't be able to use it to access your account or decrypt your data.`}</p>
                <p className="mb0">{c('Info')
                    .t`Enabling recovery by phrase again will generate a new recovery phrase.`}</p>
            </AlertModal>
        );
    }

    if (step === STEPS.AUTH) {
        const handleClose = submittingAuth ? noop : onClose;

        const loading = submittingAuth || isLoadingAuth;

        return (
            <Modal as="form" size="small" open={open} onClose={handleClose} onExit={onExit} onSubmit={handleSubmit}>
                <ModalHeader title={c('Title').t`Sign in again to continue`} />
                <ModalContent>
                    {isLoadingAuth ? (
                        <Loader />
                    ) : (
                        <PasswordTotpInputs
                            password={password}
                            setPassword={setPassword}
                            totp={totp}
                            setTotp={setTotp}
                            showTotp={hasTOTPEnabled}
                        />
                    )}
                </ModalContent>
                <ModalFooter>
                    <Button onClick={handleClose} disabled={loading}>
                        {c('Action').t`Cancel`}
                    </Button>
                    <Button loading={loading} type="submit" color="norm">
                        {c('Action').t`Submit`}
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    throw new Error('Unknown step');
};

export default DisableMnemonicModal;
