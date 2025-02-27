import React, { useContext, useEffect, useState } from "react";
import { type Session } from "@ory/client";
import { Redirect, Route, Switch } from "react-router-dom";

import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "../../components/Loading";
import LoginWrapper from "../../main/auth/LoginWrapper";
import Register from "../../main/auth/Register";
import ResetPasswordFinalize from "../../main/auth/ResetPasswordFinalize";
import ResetPasswordInit from "../../main/auth/ResetPasswordInit";
import SetInfo from "../../main/auth/SetInfo";
import VerifyEmail from "../../main/auth/VerifyEmail";
import CurrentError from "../../main/CurrentError";
import { ory } from "./ory";

type AuthnState = {
  userId: number;
  authenticate: () => Promise<void>;
  handleLogOut: () => void;
  session: Session | null;
};

export const AuthnContext = React.createContext<AuthnState | null>(null);

export const useAuthn = (): AuthnState => {
  const context = useContext(AuthnContext);
  if (context == null) {
    throw new Error("useAuthn must be used within an AuthnContext");
  }
  return context;
};

const AuthnProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { setUser, clearContext, setCurrentError, currentError } =
    useContext(Context);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(-1);
  const [logoutUrl, setLogoutUrl] = useState<string>("");
  const [hasInfo, setHasInfo] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [local, setLocal] = useState(false);

  const authenticate = async (): Promise<void> => {
    try {
      const { data: authData } = await api.checkAuth("", {}, {});
      if (authData) {
        setUser?.(authData.id, authData.email);
        setIsLoggedIn(true);
        setIsEmailVerified(authData.email_verified);
        setHasInfo(authData.company_name && true);
        setIsLoading(false);
        setUserId(authData.id);
      } else {
        setIsLoggedIn(false);
        setIsEmailVerified(false);
        setHasInfo(false);
        setIsLoading(false);
        setUserId(-1);
      }
    } catch {
      setIsLoggedIn(false);
      setIsEmailVerified(false);
      setHasInfo(false);
      setIsLoading(false);
      setUserId(-1);
    }

    try {
      const { data: orySession } = await ory.toSession();
      const { data: logOutData } = await ory.createBrowserLogoutFlow();
      setLogoutUrl(logOutData.logout_url);
      setSession(orySession);
    } catch {
      setSession(null);
      setLogoutUrl("");
    }
  };

  const handleLogOut = (): void => {
    // Clears local storage for proper rendering of clusters
    // Attempt user logout
    api
      .logOutUser("<token>", {}, {})
      .then(() => {
        setIsLoggedIn(false);
        setIsEmailVerified(false);
        clearContext?.();
        localStorage.clear();
      })
      .catch((err) => {
        setCurrentError?.(err.response?.data.errors[0]);
      });

    window.location.replace(logoutUrl);
  };

  useEffect(() => {
    authenticate().catch(() => {});

    // check if porter server is local (does not require email verification)
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setLocal(!res.data?.provisioner);
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  // return unauthenticated routes
  if (!isLoggedIn) {
    return (
      <>
        <Switch>
          <Route
            path="/login"
            render={() => {
              return <LoginWrapper authenticate={authenticate} />;
            }}
          />
          <Route
            path="/register"
            render={() => {
              return <Register authenticate={authenticate} />;
            }}
          />
          <Route
            path="/password/reset/finalize"
            render={() => {
              return <ResetPasswordFinalize />;
            }}
          />
          <Route
            path="/password/reset"
            render={() => {
              return <ResetPasswordInit />;
            }}
          />
          <Route
            path="*"
            render={() => {
              return <Redirect to="/login" />;
            }}
          />
        </Switch>
        <CurrentError currentError={currentError} />
      </>
    );
  }

  // if logged in but not verified, block until email verification
  if (!local && !isEmailVerified) {
    return (
      <>
        <Switch>
          <Route
            path="/"
            render={() => {
              return <VerifyEmail handleLogOut={handleLogOut} />;
            }}
          />
        </Switch>
        <CurrentError currentError={currentError} />
      </>
    );
  }

  // Handle case where new user signs up via OAuth and has not set name and company
  if (!hasInfo && userId > 9312) {
    return (
      <>
        <Switch>
          <Route
            path="/"
            render={() => {
              return (
                <SetInfo
                  handleLogOut={handleLogOut}
                  authenticate={authenticate}
                />
              );
            }}
          />
        </Switch>
        <CurrentError currentError={currentError} />
      </>
    );
  }

  return (
    <AuthnContext.Provider
      value={{
        userId,
        authenticate,
        handleLogOut,
        session,
      }}
    >
      {children}
    </AuthnContext.Provider>
  );
};

export default AuthnProvider;
