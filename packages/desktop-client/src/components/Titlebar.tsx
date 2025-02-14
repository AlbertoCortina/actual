import React, { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useLocation } from 'react-router-dom';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { sync } from 'loot-core/client/app/appSlice';
import * as Platform from 'loot-core/client/platform';
import * as queries from 'loot-core/client/queries';
import { listen } from 'loot-core/platform/client/fetch';
import {
  isDevelopmentEnvironment,
  isElectron,
} from 'loot-core/shared/environment';

import { useGlobalPref } from '../hooks/useGlobalPref';
import { useMetadataPref } from '../hooks/useMetadataPref';
import { useNavigate } from '../hooks/useNavigate';
import { useSyncedPref } from '../hooks/useSyncedPref';
import { SvgArrowLeft } from '../icons/v1';
import {
  SvgAlertTriangle,
  SvgNavigationMenu,
  SvgViewHide,
  SvgViewShow,
} from '../icons/v2';
import { useDispatch } from '../redux';
import { theme, styles, type CSSProperties } from '../style';

import { AccountSyncCheck } from './accounts/AccountSyncCheck';
import { AnimatedRefresh } from './AnimatedRefresh';
import { MonthCountSelector } from './budget/MonthCountSelector';
import { Button } from './common/Button2';
import { Link } from './common/Link';
import { SpaceBetween } from './common/SpaceBetween';
import { HelpMenu } from './HelpMenu';
import { LoggedInUser } from './LoggedInUser';
import { useResponsive } from './responsive/ResponsiveProvider';
import { useServerURL } from './ServerContext';
import { useSidebar } from './sidebar/SidebarProvider';
import { useSheetValue } from './spreadsheet/useSheetValue';
import { ThemeSelector } from './ThemeSelector';

function UncategorizedButton() {
  const count: number | null = useSheetValue(queries.uncategorizedCount());
  if (count === null || count <= 0) {
    return null;
  }

  return (
    <Link
      variant="button"
      buttonVariant="bare"
      to="/accounts/uncategorized"
      style={{
        color: theme.errorText,
      }}
    >
      {count} uncategorized {count === 1 ? 'transaction' : 'transactions'}
    </Link>
  );
}

type PrivacyButtonProps = {
  style?: CSSProperties;
};

function PrivacyButton({ style }: PrivacyButtonProps) {
  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';

  const privacyIconStyle = { width: 15, height: 15 };

  useHotkeys(
    'shift+ctrl+p, shift+cmd+p, shift+meta+p',
    () => {
      setPrivacyEnabledPref(String(!isPrivacyEnabled));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [setPrivacyEnabledPref, isPrivacyEnabled],
  );

  return (
    <Button
      variant="bare"
      aria-label={`${isPrivacyEnabled ? 'Disable' : 'Enable'} privacy mode`}
      onPress={() => setPrivacyEnabledPref(String(!isPrivacyEnabled))}
      style={style}
    >
      {isPrivacyEnabled ? (
        <SvgViewHide style={privacyIconStyle} />
      ) : (
        <SvgViewShow style={privacyIconStyle} />
      )}
    </Button>
  );
}

type SyncButtonProps = {
  style?: CSSProperties;
  isMobile?: boolean;
};
function SyncButton({ style, isMobile = false }: SyncButtonProps) {
  const { t } = useTranslation();
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const dispatch = useDispatch();
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<
    null | 'offline' | 'local' | 'disabled' | 'error'
  >(null);

  useEffect(() => {
    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        setSyncing(true);
        setSyncState(null);
      } else {
        // Give the layout some time to apply the starting animation
        // so we always finish it correctly even if it's almost
        // instant
        setTimeout(() => {
          setSyncing(false);
        }, 200);
      }

      if (event.type === 'error') {
        // Use the offline state if either there is a network error or
        // if this file isn't a "cloud file". You can't sync a local
        // file.
        if (event.subtype === 'network') {
          setSyncState('offline');
        } else if (!cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (event.type === 'success') {
        setSyncState(event.syncDisabled ? 'disabled' : null);
      }
    });

    return unlisten;
  }, []);

  const mobileColor =
    syncState === 'error'
      ? theme.errorText
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.mobileHeaderTextSubdued
        : theme.mobileHeaderText;
  const desktopColor =
    syncState === 'error'
      ? theme.errorTextDark
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.tableTextLight
        : 'inherit';

  const activeStyle = isMobile
    ? {
        color: mobileColor,
      }
    : {};

  const hoveredStyle = isMobile
    ? {
        color: mobileColor,
        background: theme.mobileHeaderTextHover,
      }
    : {};

  const mobileIconStyle = {
    color: mobileColor,
    justifyContent: 'center',
    margin: 10,
    paddingLeft: 5,
    paddingRight: 3,
  };

  const mobileTextStyle = {
    ...styles.text,
    fontWeight: 500,
    marginLeft: 2,
    marginRight: 5,
  };

  const onSync = () => dispatch(sync());

  useHotkeys(
    'ctrl+s, cmd+s, meta+s',
    onSync,
    {
      enableOnFormTags: true,
      preventDefault: true,
      scopes: ['app'],
    },
    [onSync],
  );

  return (
    <Button
      variant="bare"
      aria-label={t('Sync')}
      className={css({
        ...(isMobile
          ? {
              ...style,
              WebkitAppRegion: 'none',
              ...mobileIconStyle,
            }
          : {
              ...style,
              WebkitAppRegion: 'none',
              color: desktopColor,
            }),
        '&[data-hovered]': hoveredStyle,
        '&[data-pressed]': activeStyle,
      })}
      onPress={onSync}
    >
      {isMobile ? (
        syncState === 'error' ? (
          <SvgAlertTriangle width={14} height={14} />
        ) : (
          <AnimatedRefresh width={18} height={18} animating={syncing} />
        )
      ) : syncState === 'error' ? (
        <SvgAlertTriangle width={13} />
      ) : (
        <AnimatedRefresh animating={syncing} />
      )}
      <Text style={isMobile ? { ...mobileTextStyle } : { marginLeft: 3 }}>
        {syncState === 'disabled'
          ? 'Disabled'
          : syncState === 'offline'
            ? 'Offline'
            : 'Sync'}
      </Text>
    </Button>
  );
}

function BudgetTitlebar() {
  const [maxMonths, setMaxMonthsPref] = useGlobalPref('maxMonths');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MonthCountSelector
        maxMonths={maxMonths || 1}
        onChange={value => setMaxMonthsPref(value)}
      />
    </View>
  );
}

type TitlebarProps = {
  style?: CSSProperties;
};

export function Titlebar({ style }: TitlebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const serverURL = useServerURL();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  return isNarrowWidth ? null : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 10px 0 15px',
        height: 36,
        pointerEvents: 'none',
        '& *': {
          pointerEvents: 'auto',
        },
        ...(!Platform.isBrowser &&
          Platform.OS === 'mac' &&
          floatingSidebar && { paddingLeft: 80 }),
        ...style,
      }}
    >
      {(floatingSidebar || sidebar.alwaysFloats) && (
        <Button
          aria-label={t('Sidebar menu')}
          variant="bare"
          style={{ marginRight: 8 }}
          onHoverStart={e => {
            if (e.pointerType === 'mouse') {
              sidebar.setHidden(false);
            }
          }}
          onPress={e => {
            if (e.pointerType !== 'mouse') {
              sidebar.setHidden(!sidebar.hidden);
            }
          }}
        >
          <SvgNavigationMenu
            className="menu"
            style={{ width: 15, height: 15, color: theme.pageText, left: 0 }}
          />
        </Button>
      )}

      <Routes>
        <Route
          path="/accounts"
          element={
            location.state?.goBack ? (
              <Button variant="bare" onPress={() => navigate(-1)}>
                <SvgArrowLeft
                  width={10}
                  height={10}
                  style={{ marginRight: 5, color: 'currentColor' }}
                />{' '}
                {t('Back')}
              </Button>
            ) : null
          }
        />

        <Route path="/accounts/:id" element={<AccountSyncCheck />} />

        <Route path="/budget" element={<BudgetTitlebar />} />

        <Route path="*" element={null} />
      </Routes>
      <View style={{ flex: 1 }} />
      <SpaceBetween gap={10}>
        <UncategorizedButton />
        {isDevelopmentEnvironment() && !Platform.isPlaywright && (
          <ThemeSelector />
        )}
        <PrivacyButton />
        {serverURL ? <SyncButton /> : null}
        <LoggedInUser />
        {!isElectron() && <HelpMenu />}
      </SpaceBetween>
    </View>
  );
}
