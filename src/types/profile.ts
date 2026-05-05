export type UserProfile = {
  userId?: string;
  handle: string;
  name: string;
  bio: string;
  avatarId?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfileInput = {
  handle: string;
  name: string;
  bio: string;
  avatarId?: string;
};
