# OBI private libraries

Some libraries have been retrieved from BBP.
But since we still don't have a NPM repository for OBI,
we make a tarball from the code and put it here.

You can use tarballs like this in `package.json`:

```json
    "dependencies": {
        "@bbp/morphoviewer": "file:tarball/bbp-morphoviewer-0.21.4.tgz"
```

And to create a tarball, just call `npm run build` in the library project.

## Libraries

- `bbp-morphoviewer-0.21.4.tgz`: [morphoviewer](https://github.com/openbraininstitute/morphoviewer)
