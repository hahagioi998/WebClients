import { useState } from 'react';
import { c } from 'ttag';
import { decryptPrivateKey, OpenPGPKey } from 'pmcrypto';
import { noop } from '@proton/shared/lib/helpers/function';
import { requiredValidator } from '@proton/shared/lib/helpers/formValidators';
import {
    Button,
    Form,
    InputFieldTwo,
    ModalProps,
    ModalTwo as Modal,
    ModalTwoHeader as ModalHeader,
    ModalTwoContent as ModalContent,
    ModalTwoFooter as ModalFooter,
    PasswordInputTwo,
    useFormErrors,
} from '../../../components';
import { generateUID } from '../../../helpers';
import { useLoading } from '../../../hooks';

interface Props extends ModalProps {
    privateKey: OpenPGPKey;
    onSuccess: (privateKey: OpenPGPKey) => void;
}

const DecryptFileKeyModal = ({ privateKey, onSuccess, onClose, ...rest }: Props) => {
    const id = generateUID('decryptKey');
    const fingerprint = privateKey.getFingerprint();
    const fingerprintCode = <code key="0">{fingerprint}</code>;

    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [loading, withLoading] = useLoading();
    const { validator, onFormSubmit } = useFormErrors();

    const handleSubmit = async () => {
        try {
            const decryptedPrivateKey = await decryptPrivateKey(privateKey.armor(), password);
            onSuccess(decryptedPrivateKey);
            onClose?.();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleClose = loading ? noop : onClose;

    return (
        <Modal
            as={Form}
            onSubmit={() => {
                if (!onFormSubmit()) {
                    return;
                }

                void withLoading(handleSubmit());
            }}
            onClose={handleClose}
            {...rest}
        >
            <ModalHeader title={c('Title').t`Decrypt key`} />
            <ModalContent>
                <div className="mb1">
                    {c('Label').jt`Enter the password for key with fingerprint: ${fingerprintCode}`}
                </div>

                <InputFieldTwo
                    id={id}
                    as={PasswordInputTwo}
                    label={c('Label').t`Enter password`}
                    placeholder={c('Placeholder').t`Password`}
                    value={password}
                    onValue={(value: string) => {
                        setError('');
                        setPassword(value);
                    }}
                    error={validator([requiredValidator(password), error])}
                    autoFocus
                />
            </ModalContent>
            <ModalFooter>
                <Button onClick={handleClose} disabled={loading}>
                    {c('Action').t`Close`}
                </Button>

                <Button loading={loading} type="submit" color="norm">
                    {c('Action').t`Decrypt`}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default DecryptFileKeyModal;
