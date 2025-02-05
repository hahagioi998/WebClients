import { useRef } from 'react';
import { c } from 'ttag';
import { useLocation } from 'react-router-dom';

import {
    Icon,
    DropdownMenu,
    DropdownMenuButton,
    useApi,
    useEventManager,
    useFolders,
    ButtonGroup,
    Button,
    Tooltip,
    useLabels,
    useMailSettings,
    useLoading,
    useModalState,
} from '@proton/components';
import { Message } from '@proton/shared/lib/interfaces/mail/Message';
import { MAILBOX_LABEL_IDS } from '@proton/shared/lib/constants';
import downloadFile from '@proton/shared/lib/helpers/downloadFile';
import { MailSettings } from '@proton/shared/lib/interfaces';
import { useDispatch } from 'react-redux';
import { DecryptResultPmcrypto } from 'pmcrypto';
import MessageHeadersModal from '../modals/MessageHeadersModal';
import { getDate, isStarred as IsMessageStarred } from '../../../helpers/elements';
import { formatFileNameDate } from '../../../helpers/date';
import MessagePrintModal from '../modals/MessagePrintModal';
import { exportBlob } from '../../../helpers/message/messageExport';
import HeaderDropdown, { DropdownRender } from './HeaderDropdown';
import { useMoveToFolder, useStar } from '../../../hooks/useApplyLabels';
import { getFolderName, getCurrentFolderID } from '../../../helpers/labels';
import { useMarkAs, MARK_AS_STATUS } from '../../../hooks/useMarkAs';
import { Element } from '../../../models/element';
import { Breakpoints } from '../../../models/utils';
import CustomFilterDropdown from '../../dropdown/CustomFilterDropdown';
import MoveDropdown from '../../dropdown/MoveDropdown';
import LabelDropdown from '../../dropdown/LabelDropdown';
import { useGetMessageKeys } from '../../../hooks/message/useGetMessageKeys';
import { isConversationMode } from '../../../helpers/mailSettings';
import { updateAttachment } from '../../../logic/attachments/attachmentsActions';
import { useGetAttachment } from '../../../hooks/useAttachment';
import { MessageState, MessageStateWithData } from '../../../logic/messages/messagesTypes';
import MessageDetailsModal from '../modals/MessageDetailsModal';
import { MessageViewIcons } from '../../../helpers/message/icon';
import MessagePhishingModal from '../modals/MessagePhishingModal';
import MessagePermanentDeleteModal from '../modals/MessagePermanentDeleteModal';

const { INBOX, TRASH, SPAM, ARCHIVE } = MAILBOX_LABEL_IDS;

interface Props {
    labelID: string;
    message: MessageState;
    messageLoaded: boolean;
    sourceMode: boolean;
    onBack: () => void;
    onToggle: () => void;
    onSourceMode: (sourceMode: boolean) => void;
    breakpoints: Breakpoints;
    parentMessageRef: React.RefObject<HTMLElement>;
    mailSettings: MailSettings;
    messageViewIcons: MessageViewIcons;
}

const HeaderMoreDropdown = ({
    labelID,
    message,
    messageLoaded,
    sourceMode,
    onBack,
    onToggle,
    onSourceMode,
    breakpoints,
    parentMessageRef,
    mailSettings,
    messageViewIcons,
}: Props) => {
    const location = useLocation();
    const api = useApi();
    const getAttachment = useGetAttachment();
    const dispatch = useDispatch();
    const [loading, withLoading] = useLoading();
    const star = useStar();
    const { call } = useEventManager();
    const closeDropdown = useRef<() => void>();
    const moveToFolder = useMoveToFolder();
    const [folders = []] = useFolders();
    const [labels = []] = useLabels();
    const markAs = useMarkAs();
    const getMessageKeys = useGetMessageKeys();
    const [{ Shortcuts = 0 } = {}] = useMailSettings();

    const [messageDetailsModalProps, setMessageDetailsModalOpen] = useModalState();
    const [messageHeaderModalProps, setMessageHeaderModalOpen] = useModalState();
    const [messagePrintModalProps, setMessagePrintModalOpen, renderPrintModal] = useModalState();
    const [messagePhishingModalProps, setMessagePhishingModalOpen] = useModalState();
    const [messagePermanentDeleteModalProps, setMessagePermanentDeleteModalOpen] = useModalState();

    const isStarred = IsMessageStarred(message.data || ({} as Element));

    const staringText = isStarred ? c('Action').t`Unstar` : c('Action').t`Star`;

    const handleMove = (folderID: string, fromFolderID: string) => async () => {
        closeDropdown.current?.();
        const folderName = getFolderName(folderID, folders);
        await moveToFolder([message.data || ({} as Element)], folderID, folderName, fromFolderID);
    };

    const handleUnread = async () => {
        closeDropdown.current?.();
        onToggle();
        if (isConversationMode(labelID, mailSettings, location)) {
            parentMessageRef.current?.focus();
        } else {
            onBack();
        }
        markAs([message.data as Element], labelID, MARK_AS_STATUS.UNREAD);
        await call();
    };

    const onUpdateAttachment = (ID: string, attachment: DecryptResultPmcrypto) => {
        dispatch(updateAttachment({ ID, attachment }));
    };

    const handleExport = async () => {
        // Angular/src/app/message/directives/actionMessage.js
        const messageKeys = await getMessageKeys(message.data as Message);
        const { Subject = '' } = message.data || {};
        const time = formatFileNameDate(getDate(message.data, labelID));
        const blob = await exportBlob(message, messageKeys, getAttachment, onUpdateAttachment, api);
        const filename = `${Subject} ${time}.eml`;
        downloadFile(blob, filename);
    };

    const handleStar = async () => {
        if (!loading) {
            void withLoading(star([message.data || ({} as Element)], !isStarred));
        }
    };

    const messageLabelIDs = message.data?.LabelIDs || [];
    const selectedIDs = [message.data?.ID || ''];
    const isSpam = messageLabelIDs.includes(SPAM);
    const isInTrash = messageLabelIDs.includes(TRASH);
    const fromFolderID = getCurrentFolderID(messageLabelIDs, folders);
    const { isNarrow } = breakpoints;
    const additionalDropdowns: DropdownRender[] | undefined = isNarrow
        ? [
              ({ onClose, onLock }) => (
                  <CustomFilterDropdown message={message.data as Message} onClose={onClose} onLock={onLock} />
              ),
              ({ onClose, onLock }) => (
                  <MoveDropdown
                      labelID={fromFolderID}
                      selectedIDs={selectedIDs}
                      conversationMode={false}
                      onClose={onClose}
                      onLock={onLock}
                      onBack={onBack}
                      breakpoints={breakpoints}
                  />
              ),
              ({ onClose, onLock }) => (
                  <LabelDropdown
                      labelID={labelID}
                      labels={labels}
                      selectedIDs={selectedIDs}
                      onClose={onClose}
                      onLock={onLock}
                      breakpoints={breakpoints}
                  />
              ),
          ]
        : undefined;

    const titleMoveInboxNotSpam = Shortcuts ? (
        <>
            {c('Title').t`Move to inbox (not spam)`}
            <br />
            <kbd className="border-none">I</kbd>
        </>
    ) : (
        c('Title').t`Move to inbox (not spam)`
    );
    const titleUnread = Shortcuts ? (
        <>
            {c('Title').t`Mark as unread`}
            <br />
            <kbd className="border-none">U</kbd>
        </>
    ) : (
        c('Title').t`Mark as unread`
    );
    const titleMoveInbox = Shortcuts ? (
        <>
            {c('Title').t`Move to inbox`}
            <br />
            <kbd className="border-none">I</kbd>
        </>
    ) : (
        c('Title').t`Move to inbox`
    );
    const titleMoveTrash = Shortcuts ? (
        <>
            {c('Title').t`Move to trash`}
            <br />
            <kbd className="border-none">T</kbd>
        </>
    ) : (
        c('Title').t`Move to trash`
    );

    return (
        <>
            <ButtonGroup className="mr1 mb0-5">
                {isSpam ? (
                    <Tooltip title={titleMoveInboxNotSpam}>
                        <Button icon disabled={!messageLoaded} onClick={handleMove(INBOX, SPAM)}>
                            <Icon name="fire-slash" alt={c('Title').t`Move to inbox (not spam)`} />
                        </Button>
                    </Tooltip>
                ) : (
                    <Tooltip title={titleUnread}>
                        <Button
                            icon
                            disabled={!messageLoaded}
                            onClick={handleUnread}
                            data-testid="message-header-expanded:mark-as-unread"
                        >
                            <Icon name="eye-slash" alt={c('Title').t`Mark as unread`} />
                        </Button>
                    </Tooltip>
                )}
                {isInTrash ? (
                    <Tooltip title={titleMoveInbox}>
                        <Button icon disabled={!messageLoaded} onClick={handleMove(INBOX, TRASH)}>
                            <Icon name="inbox" alt={c('Title').t`Move to inbox`} />
                        </Button>
                    </Tooltip>
                ) : (
                    <Tooltip title={titleMoveTrash}>
                        <Button
                            icon
                            disabled={!messageLoaded}
                            onClick={handleMove(TRASH, fromFolderID)}
                            data-testid="message-header-expanded:move-to-trash"
                        >
                            <Icon name="trash" alt={c('Title').t`Move to trash`} />
                        </Button>
                    </Tooltip>
                )}
                <HeaderDropdown
                    icon
                    disabled={!messageLoaded}
                    autoClose
                    title={c('Title').t`More`}
                    content={<Icon name="ellipsis" className="caret-like" alt={c('Title').t`More options`} />}
                    additionalDropdowns={additionalDropdowns}
                    data-testid="message-header-expanded:more-dropdown"
                    noMaxHeight
                    noMaxSize
                >
                    {({ onClose, onOpenAdditionnal }) => {
                        closeDropdown.current = onClose;
                        return (
                            <DropdownMenu>
                                <DropdownMenuButton className="text-left flex flex-nowrap" onClick={handleStar}>
                                    <Icon name={isStarred ? 'star-remove' : 'star'} className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{staringText}</span>
                                </DropdownMenuButton>

                                <hr className="my0-5" />

                                <DropdownMenuButton
                                    className="text-left flex flex-nowrap"
                                    onClick={handleMove(ARCHIVE, fromFolderID)}
                                >
                                    <Icon name="box-archive" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action').t`Archive`}</span>
                                </DropdownMenuButton>
                                {isNarrow && (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => onOpenAdditionnal(0)}
                                    >
                                        <Icon name="filter" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`Filter on...`}</span>
                                    </DropdownMenuButton>
                                )}
                                {isNarrow && (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => onOpenAdditionnal(1)}
                                    >
                                        <Icon name="folder" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`Move to...`}</span>
                                    </DropdownMenuButton>
                                )}
                                {isNarrow && (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => onOpenAdditionnal(2)}
                                    >
                                        <Icon name="tag" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`Label as...`}</span>
                                    </DropdownMenuButton>
                                )}
                                {isSpam ? (
                                    <DropdownMenuButton className="text-left flex flex-nowrap" onClick={handleUnread}>
                                        <Icon name="eye-slash" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`Mark as unread`}</span>
                                    </DropdownMenuButton>
                                ) : (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={handleMove(SPAM, fromFolderID)}
                                    >
                                        <Icon name="fire" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`Move to spam`}</span>
                                    </DropdownMenuButton>
                                )}
                                {isInTrash ? (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => setMessagePermanentDeleteModalOpen(true)}
                                    >
                                        <Icon name="circle-xmark" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action').t`Delete`}</span>
                                    </DropdownMenuButton>
                                ) : null}

                                <hr className="my0-5" />

                                <DropdownMenuButton className="text-left flex flex-nowrap" onClick={handleExport}>
                                    <Icon name="arrow-up-from-screen" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action').t`Export`}</span>
                                </DropdownMenuButton>
                                <DropdownMenuButton
                                    className="text-left flex flex-nowrap"
                                    onClick={() => setMessagePrintModalOpen(true)}
                                >
                                    <Icon name="printer" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action').t`Print`}</span>
                                </DropdownMenuButton>

                                <hr className="my0-5" />

                                <DropdownMenuButton
                                    className="text-left flex flex-nowrap"
                                    onClick={() => setMessageDetailsModalOpen(true)}
                                >
                                    <Icon name="list" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                        .t`View message details`}</span>
                                </DropdownMenuButton>
                                <DropdownMenuButton
                                    className="text-left flex flex-nowrap"
                                    onClick={() => setMessageHeaderModalOpen(true)}
                                >
                                    <Icon name="window-terminal" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action').t`View headers`}</span>
                                </DropdownMenuButton>
                                {!sourceMode && (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => onSourceMode(true)}
                                    >
                                        <Icon name="code" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`View HTML`}</span>
                                    </DropdownMenuButton>
                                )}
                                {sourceMode && (
                                    <DropdownMenuButton
                                        className="text-left flex flex-nowrap"
                                        onClick={() => onSourceMode(false)}
                                    >
                                        <Icon name="window-image" className="mr0-5 mt0-25" />
                                        <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                            .t`View rendered HTML`}</span>
                                    </DropdownMenuButton>
                                )}

                                <hr className="my0-5" />

                                <DropdownMenuButton
                                    className="text-left flex flex-nowrap color-danger"
                                    onClick={() => setMessagePhishingModalOpen(true)}
                                >
                                    <Icon name="hook" className="mr0-5 mt0-25" />
                                    <span className="flex-item-fluid mtauto mbauto">{c('Action')
                                        .t`Report phishing`}</span>
                                </DropdownMenuButton>
                            </DropdownMenu>
                        );
                    }}
                </HeaderDropdown>
            </ButtonGroup>
            <MessageDetailsModal
                labelID={labelID}
                message={message}
                mailSettings={mailSettings}
                messageViewIcons={messageViewIcons}
                messageLoaded={messageLoaded}
                {...messageDetailsModalProps}
            />
            <MessageHeadersModal message={message.data} {...messageHeaderModalProps} />
            {renderPrintModal && (
                <MessagePrintModal
                    message={message as MessageStateWithData}
                    labelID={labelID}
                    {...messagePrintModalProps}
                />
            )}
            <MessagePhishingModal message={message} onBack={onBack} {...messagePhishingModalProps} />
            <MessagePermanentDeleteModal message={message} {...messagePermanentDeleteModalProps} />
        </>
    );
};

export default HeaderMoreDropdown;
