// js/edit.js

// Verifica o estado de autenticação do usuário
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        console.log('Usuário autenticado:', user.email);
        initializeCalendar();
    } else {
        alert('Acesso negado! Por favor, faça login.');
        window.location.href = 'login.html';
    }
});

// Função para verificar se o dispositivo é móvel
function isMobile() {
    return window.innerWidth <= 768;
}

function initializeCalendar() {
    // Função para logout
    document.getElementById('logout-button').addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });

    var calendarEl = document.getElementById('calendar');
    var registerButton = document.getElementById('register-availability-button');
    var registerPopup = document.getElementById('register-popup');
    var eventTitleInput = document.getElementById('event-title');

    // Array para armazenar as seleções
    var selectedSlots = [];

    // Inicializa o calendário
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile() ? 'timeGridDay' : 'timeGridWeek',
        locale: 'pt-br',
        timeZone: 'local',
        height: 'auto',
        allDaySlot: false,
        slotDuration: '00:30:00',
        slotLabelInterval: '01:00',
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile() ? 'timeGridDay,listWeek' : 'timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        selectOverlap: false,
        eventOverlap: false,
        select: function(info) {
            // Verifica se já há um slot selecionado na faixa
            var overlap = selectedSlots.some(function(slot) {
                return (info.start < slot.end && info.end > slot.start);
            });

            if (overlap) {
                alert('Esse horário já está selecionado.');
                calendar.unselect();
                return;
            }

            // Adiciona o slot à lista de seleções
            selectedSlots.push({ start: info.start, end: info.end });

            // Adiciona um evento de fundo para destacar a seleção
            calendar.addEvent({
                title: 'Selecionado',
                start: info.start,
                end: info.end,
                allDay: false,
                display: 'background',
                backgroundColor: '#ffb3d9',
                overlap: false
            });

            // Mostra o botão de registrar disponibilidade
            registerButton.classList.remove('hidden');

            calendar.unselect();
        },
        eventClick: function(info) {
            if (info.event.title === 'Selecionado') {
                // Remove da lista de seleções
                selectedSlots = selectedSlots.filter(function(slot) {
                    return !(slot.start.getTime() === info.event.start.getTime() && slot.end.getTime() === info.event.end.getTime());
                });

                // Remove o evento do calendário
                info.event.remove();

                // Oculta o botão se não houver mais seleções
                if (selectedSlots.length === 0) {
                    registerButton.classList.add('hidden');
                }
            }
        },
        events: []
    });

    // Renderiza o calendário
    calendar.render();

    // Carrega os eventos do Firebase e atualiza o calendário
    var eventsRef = firebase.database().ref('events');
    eventsRef.on('value', function(snapshot) {
        var events = [];

        snapshot.forEach(function(childSnapshot) {
            var event = childSnapshot.val();
            events.push({
                id: childSnapshot.key,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay
            });
        });

        // Remove todos os eventos atuais, exceto os "Selecionado"
        calendar.getEvents().forEach(function(event) {
            if (event.title !== 'Selecionado') {
                event.remove();
            }
        });

        // Adiciona os eventos carregados
        calendar.addEventSource(events);
    });

    // Função para abrir o popup de registro
    window.openRegisterPopup = function() {
        if (selectedSlots.length === 0) {
            alert('Por favor, selecione pelo menos um horário.');
            return;
        }

        // Limpa o input de título
        eventTitleInput.value = '';

        // Exibe o popup
        registerPopup.classList.add('show');
    };

    // Função para fechar o popup de registro
    window.closeRegisterPopup = function() {
        registerPopup.classList.remove('show');
    };

    // Função para registrar o evento no Firebase
    window.registerEvent = function() {
        var title = eventTitleInput.value.trim();

        if (title === '') {
            alert('Por favor, insira o nome do evento.');
            return;
        }

        if (selectedSlots.length === 0) {
            alert('Nenhum horário selecionado.');
            return;
        }

        // Itera sobre os slots selecionados e salva cada um como um evento separado
        selectedSlots.forEach(function(slot) {
            var newEventRef = firebase.database().ref('events').push();
            newEventRef.set({
                title: title,
                start: slot.start.toISOString(),
                end: slot.end.toISOString(),
                allDay: false
            });

            // Adiciona o evento ao calendário
            calendar.addEvent({
                id: newEventRef.key,
                title: title,
                start: slot.start,
                end: slot.end,
                allDay: false
            });
        });

        // Limpa as seleções
        selectedSlots = [];

        // Remove os eventos de fundo
        calendar.getEvents().forEach(function(event) {
            if (event.title === 'Selecionado') {
                event.remove();
            }
        });

        // Oculta o botão de registrar
        registerButton.classList.add('hidden');

        // Fecha o popup
        closeRegisterPopup();

        alert('Disponibilidade registrada com sucesso!');
    };
}
