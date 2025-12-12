import { useState } from 'react';
import useApiRateLimit from '../hooks/useApiRateLimit';

const initialLogin = { email: '', password: '' };
const initialRegister = { name: '', email: '', password: '' };

export default function AuthForms({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [loginValues, setLoginValues] = useState(initialLogin);
  const [registerValues, setRegisterValues] = useState(initialRegister);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isRateLimited, remaining } = useApiRateLimit();
  const passwordAttributes =
    mode === 'register'
      ? {
          pattern: '^(?=.*[A-Za-z])(?=.*\\d).+$',
          title: 'Must contain at least one letter and one number.'
        }
      : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onAuth(mode, mode === 'login' ? loginValues : registerValues);
      setLoginValues(initialLogin);
      setRegisterValues(initialRegister);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-toggle">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Login
        </button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label>
            Full name
            <input
              type="text"
              value={registerValues.name}
              onChange={(e) => setRegisterValues({ ...registerValues, name: e.target.value })}
              required
              minLength={2}
              maxLength={100}
              pattern="^[A-Za-z][A-Za-z\\s.'-]*$"
              title="Use letters, spaces, apostrophes, periods, or dashes only."
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={mode === 'login' ? loginValues.email : registerValues.email}
            onChange={(e) =>
              mode === 'login'
                ? setLoginValues({ ...loginValues, email: e.target.value })
                : setRegisterValues({ ...registerValues, email: e.target.value })
            }
            required
          />
        </label>

          <label>
            Password
            <input
              type="password"
              value={mode === 'login' ? loginValues.password : registerValues.password}
              onChange={(e) =>
                mode === 'login'
                  ? setLoginValues({ ...loginValues, password: e.target.value })
                  : setRegisterValues({ ...registerValues, password: e.target.value })
              }
              required
              minLength={8}
              maxLength={128}
              {...passwordAttributes}
            />
          </label>

        {error && <p className="error">{error}</p>}
        {isRateLimited && <p className="error">Please wait {remaining}s before retrying.</p>}
        <button type="submit" disabled={loading || isRateLimited}>
          {isRateLimited ? `Try again in ${remaining}s` : loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </div>
  );
}


