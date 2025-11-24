# Screenshot Upload Fix

## Problem

Screenshots uploaded through the feedback form were not visible in GitHub issues because:

1. GitHub's REST API doesn't support direct asset uploads to issues
2. Data URIs (base64 images) don't work in GitHub markdown

## Solution

Integrated **Imgur API** for reliable, free image hosting.

## How It Works

1. User uploads images via the feedback form (for bug reports)
2. Images are converted to base64 in the browser
3. API route uploads images to Imgur
4. Imgur returns permanent image URLs
5. GitHub issue is updated with markdown image links

## Configuration (Optional)

### Default Setup

Works out of the box with a default Imgur Client ID for anonymous uploads.

### Custom Imgur App (Recommended for Production)

To avoid rate limits and have more control:

1. Create an Imgur account at https://imgur.com
2. Register your application at https://api.imgur.com/oauth2/addclient
   - Application name: "OBI Feedback System" (or any name)
   - Authorization type: "Anonymous usage without user authorization"
   - Authorization callback URL: (not needed for anonymous uploads)
3. Copy your Client ID
4. Add to your `.env` files:
   ```
   IMGUR_CLIENT_ID=your_client_id_here
   ```

### Rate Limits

- Anonymous uploads: ~1,250 uploads per day
- With registered app: Higher limits based on your account

## Alternative Solutions

If Imgur doesn't meet your needs, you can replace it with:

- **Cloudinary** (more features, free tier)
- **AWS S3** (more control, costs may apply)
- **GitHub's GraphQL API** (complex, but keeps everything in GitHub)

## Files Modified

- `src/app/api/feedback/create-ticket/route.ts` - Imgur upload implementation
