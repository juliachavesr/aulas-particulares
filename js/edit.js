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

function initializeCalendar() {
    document.getElementById('logout-button').addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });

    var calendarEl = document.getElementById('calendar');

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'pt-br',
        timeZone: 'local',
        allDaySlot: false,
        slotDuration: '01:00:00',
        slotLabelInterval: '01:00',
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        eventOverlap: false,
        selectOverlap: false,
        select: function(info) {
            var title = prompt('Digite o título para este horário:');
            if (title) {
                // Salva o novo evento no Firebase
                var newEventRef = firebase.database().ref('events').push();
                newEventRef.set({
                    title: title,
                    start: info.startStr,
                    end: info.endStr,
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
