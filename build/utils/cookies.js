const cookies = {
    set(res, name, value, options = {}) {
        const defaultOptions = {
            httpOnly: true,
            secure: true,
            signed: true,
            sameSite: 'none',
        };
        res.cookie(name, value, Object.assign(Object.assign({}, defaultOptions), options));
    },
    get(req, name, signed = true) {
        return signed ? req.signedCookies[name] : req.cookies[name];
    },
    delete(res, name) {
        res.clearCookie(name);
    },
};
export default cookies;
