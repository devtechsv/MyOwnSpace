import auth from './auth/auth.api';
import users from './users/users.api';
import requests from './requests/requests.api';
import pto from './pto/pto.api';
import audit from './audit/audit.api';

const API = {
  auth,
  users,
  requests,
  pto,
  audit,
};

export default API;
