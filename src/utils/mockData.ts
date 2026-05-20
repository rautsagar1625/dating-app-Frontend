export interface MockUser {
  id: string;
  name: string;
  username: string;
  age: number;
  gender: string;
  location: string;
  bio: string;
  profilePhoto: string;
  privatePhoto: string;
  isPhotoPrivate: boolean;
  isOnline: boolean;
  liked: boolean;
  recommended?: boolean;
}

export const CREDIT_PACKAGES = [
  { id: 'c1', credits: 50, price: '₹199', popular: false },
  { id: 'c2', credits: 150, price: '₹499', popular: true },
  { id: 'c3', credits: 350, price: '₹999', popular: false },
  { id: 'c4', credits: 750, price: '₹1,799', popular: false },
];
