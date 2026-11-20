import {
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { ROUTES } from './routes';

/* Lets code outside the screens (the store, banner and reminder) navigate. */
export const navigationRef = createNavigationContainerRef();

// Both return false when the screens are not mounted yet (app still starting).

// Show the software list, closing any software screen that is open on top of it
export function openHome() {
  if (!navigationRef.isReady()) return false;
  const tab = navigationRef
    .getRootState()
    .routes.find(r => r.name === ROUTES.approvals);
  if (tab && tab.state && tab.state.index > 0) {
    navigationRef.dispatch({
      ...StackActions.popToTop(),
      target: tab.state.key,
    });
  }
  navigationRef.navigate(ROUTES.approvals);
  return true;
}

// view: 'list' (the default) or 'cards' (the swipe review)
export function openSoftware(swId, view = 'list') {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate(ROUTES.approvals, {
    screen: ROUTES.software,
    params: { swId, view },
  });
  return true;
}
