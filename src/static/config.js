const config = {
    // Change this to your deployed backend URL when deploying
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://yashsawarkar.pythonanywhere.com/' // Replace your_username with your actual PythonAnywhere username
};
