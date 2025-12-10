import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";

const passportConfig = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
            return done(null, user);
          }

          // If user doesn't exist, create new user
          // We generate a random password since they will login via Google
          const randomPassword =
            Math.random().toString(36).slice(-8) +
            Math.random().toString(36).slice(-8);

          user = await User.create({
            username: profile.displayName,
            email: profile.emails[0].value,
            password: randomPassword,
            googleId: profile.id,
            isAdmin: false,
          });

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Serialize/Deserialize not strictly needed for JWT stateless auth,
  // but required by passport to suppress warnings in some configurations.
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
  });
};

export default passportConfig;
