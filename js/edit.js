// js/edit.js

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        console.log('Usuário autenticado:', user.email);
        initializeCalendar();
    } else {
        alert('Acesso negado! Por favor, faça login.');
        window.location.href = 'login.html';
    }
});

function isMobile() {
    return window.innerWidth <= 768;
}

function initializeCalendar() {
    document.getElementById('logout-button').addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });

    var calendarEl = document.getElementById('calendar');
    var initialView = isMobile() ? 'timeGridDay' : 'timeGridWeek';

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: initialView,
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
        eventOverlap: false,
        selectOverlap: false,
        longPressDelay: 0, // Adicionado para permitir seleção imediata em dispositivos móveis
        select: function(info) {
            var title = prompt('Digite o título para este horário:');
            if (title) {
                // Salva o novo evento no Firebase
                var newEventRef = firebase.database().ref('events').push();
                newEventRef.set({
                    title: title,
                    start: info.start.toISOString(),
                    end: info.end.toISOString(),
                    allDay: false
                });
            }
            calendar.unselect();
        },
        eventClick: function(info) {
            if (confirm('Deseja remover este evento?')) {
                // Remove o evento do Firebase
                firebase.database().ref('events/' + info.event.id).remove();
                // Remove o evento do calendário
                info.event.remove();
            }
        },
        events: []
    });

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

        // Remove todos os eventos atuais
        calendar.removeAllEvents();

        // Adiciona os eventos carregados
        calendar.addEventSource(events);
    });
}
