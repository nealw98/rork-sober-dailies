#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "PosthogReactNativeSessionReplay-Bridging-Header.h"

FOUNDATION_EXPORT double posthog_react_native_session_replayVersionNumber;
FOUNDATION_EXPORT const unsigned char posthog_react_native_session_replayVersionString[];

