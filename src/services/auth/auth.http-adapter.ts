import { ServerResponse } from 'http';
import apiClient from '@/services/api-client';
import {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  Session,
} from '@/contracts/interfaces/auth';


import { SESSION_COOKIE } from './session-cookie';

export type SessionCheckResult =
  | { status: 'valid'; session: Session }
  | { status: 'expired' }
  | { status: 'none' };

export const httpAuthAdapter = {
  async login(payload: LoginPayload): Promise<Session> {
    const { data } = await apiClient.post<Session>('/auth/login', payload);
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post('/auth/forgot-password', payload);
  },

  // Corre server-side (getServerSideProps). El JWT es opaco para el
  // frontend — la única forma de saber si sigue siendo válido es
  // preguntarle al backend. Node no adjunta cookies solo por estar en
  // el mismo dominio (a diferencia del navegador), así que se reenvía
  // el header Cookie a mano; si el backend renueva el token, su propio
  // Set-Cookie se retransmite a la respuesta real para que el
  // navegador también la actualice.
  async refreshSession(accessToken: string, res: ServerResponse): Promise<SessionCheckResult> {
    try {
      const response = await apiClient.get<Session>('/auth/session', {
        headers: { Cookie: `${SESSION_COOKIE}=${accessToken}` },
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        res.setHeader('Set-Cookie', setCookieHeader);
      }

      return { status: 'valid', session: response.data };
    } catch {
      return { status: 'expired' };
    }
  },
    async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/auth/change-password', payload);
  },
};