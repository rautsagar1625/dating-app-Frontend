export type AuthStackParamList = {
  Login:          undefined;
  Register:       undefined;
  ForgotPassword: undefined;
  ResetPassword:  { token: string; email: string };
};

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
};

export type AppStackParamList = {
  MainTabs:             undefined;
  ProfileDetail:        { userId: string };
  Chat:                 { userId: string; userName: string; userAvatar?: string };
  ChatList:             undefined;
  Visitors:             undefined;
  Favorites:            undefined;
  PrivacySettings:      undefined;
  Admin:                undefined;
  Subscription:         undefined;
  AccountSettings:      undefined;
  DeleteAccount:        undefined;
  BlockedUsers:         undefined;
  PhotoAccessRequests:  undefined;
  // New features
  Notebook:             undefined;
  News:                 undefined;
  Gifts:                undefined;
  Notifications:        undefined;
};

export type MainTabParamList = {
  Browse:    undefined;
  Crushes:   undefined;
  Messages:  undefined;
  MyProfile: undefined;
};

export type RootStackParamList = {
  Auth:        undefined;
  Onboarding:  undefined;
  App:         undefined;
};
