import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { c } from 'ttag';
import { useApi, useNotifications, useLoading, ForgotUsernameForm } from 'react-components';
import { requestUsername } from 'proton-shared/lib/api/reset';

import SignInLayout from '../components/layout/SignInLayout';

const ForgotUsernameContainer = ({ history }) => {
    const api = useApi();
    const [loading, withLoading] = useLoading();
    const { createNotification } = useNotifications();

    const handleSubmit = async (email) => {
        await api(requestUsername(email));
        createNotification({
            text: c('Success')
                .t`If you entered a valid notification email we will send you an email with your usernames in the next minute.`
        });
        history.push('/login');
    };

    return (
        <SignInLayout title={c('Title').t`Forgot your username?`}>
            <ForgotUsernameForm onSubmit={(data) => withLoading(handleSubmit(data))} loading={loading} />
            <div>
                <Link to="/login">{c('Link').t`Back to login`}</Link>
            </div>
        </SignInLayout>
    );
};

ForgotUsernameContainer.propTypes = {
    history: PropTypes.object.isRequired
};

export default withRouter(ForgotUsernameContainer);
