import { AuthProvider } from '../../shared/context/AuthContext';
import { ModalProvider } from '../../shared/context/ModalContext';
import Modal from '../../shared/components/Modal/Modal';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ModalProvider>
        <Modal />
        {children}
      </ModalProvider>
    </AuthProvider>
  );
}

