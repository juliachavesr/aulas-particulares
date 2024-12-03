// js/login.js

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    // Autenticação com o Firebase
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login bem-sucedido
            window.location.href = 'edit.html';
        })
        .catch((error) => {
            alert('Erro ao fazer login: ' + error.message);
        });
});
