import React, { useState } from 'react';
import { createToken } from 'proton-shared/lib/api/payments';
import { useApi, useLoading, useModals } from 'react-components';

import PaymentVerificationModal from '../containers/payments/PaymentVerificationModal';
import { process } from '../containers/payments/paymentTokenHelper';

const usePayPal = ({ amount: Amount = 0, currency: Currency = '', type: Type, onPay }) => {
    const api = useApi();
    const [model, setModel] = useState({});
    const [loadingVerification, withLoadingVerification] = useLoading();
    const [loadingToken, withLoadingToken] = useLoading();
    const { createModal } = useModals();
    const clear = () => setModel({});

    const onToken = async () => {
        try {
            const result = await api(
                createToken({
                    Amount,
                    Currency,
                    Payment: { Type }
                })
            );
            setModel(result);
        } catch (error) {
            clear();
            throw error;
        }
    };

    const onVerification = async () => {
        const { Token, ApprovalURL, ReturnHost } = model;
        const result = await new Promise((resolve, reject) => {
            const onProcess = () => {
                const abort = new AbortController();
                return {
                    promise: process({
                        Token,
                        api,
                        ReturnHost,
                        ApprovalURL,
                        signal: abort.signal
                    }),
                    abort
                };
            };
            createModal(
                <PaymentVerificationModal
                    params={{ Amount, Currency }}
                    token={Token}
                    onSubmit={resolve}
                    onClose={reject}
                    type={Type}
                    onProcess={onProcess}
                    initialProcess={onProcess()}
                />
            );
        });
        onPay(result);
    };

    return {
        isReady: !!model.Token,
        loadingToken,
        loadingVerification,
        onToken: () => withLoadingToken(onToken()),
        onVerification: () => withLoadingVerification(onVerification()),
        clear
    };
};

export default usePayPal;
