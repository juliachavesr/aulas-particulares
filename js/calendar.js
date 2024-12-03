// js/calendar.js

function isMobile() {
    return window.innerWidth <= 768;
}

document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('calendar');
    var selectedEvent = null; // Armazena o horário selecionado

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
            right: isMobile() ? 'timeGridDay,listWeek' : 'timeGridWeek,timeGridDay',
        },
        selectable: true,
        selectOverlap: false,
        eventOverlap: false,
        select: function (info) {
            // Remove a seleção anterior
            if (selectedEvent) {
                selectedEvent.remove();
            }

            // Cria um evento visual para o horário selecionado
            selectedEvent = calendar.addEvent({
                title: 'Selecionado',
                start: info.start,
                end: info.end,
                backgroundColor: '#ffcccb',
                borderColor: '#ff6666',
            });

            // Calcula os dados para o agendamento
            var start = moment(info.start);
            var end = moment(info.end);
            var duration = moment.duration(end.diff(start));
            var hours = duration.asHours();
            var total = hours * 50; // R$ 50 por hora

            // Atualiza o botão de agendamento
            var scheduleButton = document.getElementById('confirm-schedule-button');
            scheduleButton.style.display = 'block'; // Torna o botão visível
            scheduleButton.dataset.start = info.start.toISOString();
            scheduleButton.dataset.end = info.end.toISOString();
            scheduleButton.dataset.total = total.toFixed(2);

            calendar.unselect();
        },
        events: [],
    });

    calendar.render();

    // Carrega os eventos do Firebase e atualiza o calendário
    var eventsRef = firebase.database().ref('events');
    eventsRef.on('value', function (snapshot) {
        var events = [];

        snapshot.forEach(function (childSnapshot) {
            var event = childSnapshot.val();
            events.push({
                id: childSnapshot.key,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
            });
        });

        // Remove todos os eventos atuais
        calendar.removeAllEvents();

        // Adiciona os eventos carregados
        calendar.addEventSource(events);
    });
});

// Função para confirmar o agendamento
function confirmSchedule() {
    var scheduleButton = document.getElementById('confirm-schedule-button');
    var start = moment(scheduleButton.dataset.start);
    var end = moment(scheduleButton.dataset.end);
    var total = scheduleButton.dataset.total;

    // Cria a mensagem para o WhatsApp
    var whatsappMessage = encodeURIComponent(
        `Olá, gostaria de agendar uma aula.\n` +
        `Data e Hora: ${start.format('DD/MM/YYYY HH:mm')} até ${end.format('DD/MM/YYYY HH:mm')}\n` +
        `Total de horas: ${(end.diff(start, 'hours'))}\n` +
        `Valor total: R$ ${total}`
    );

    // URL do WhatsApp
    var whatsappNumber = '+5581999298108'; // Substitua pelo número correto
    var whatsappURL = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    // Atualiza o banco de dados com o novo evento
    var eventsRef = firebase.database().ref('events');
    eventsRef.push({
        title: 'Aula Agendada',
        start: scheduleButton.dataset.start,
        end: scheduleButton.dataset.end,
        allDay: false,
    });

    // Redireciona para o WhatsApp
    window.open(whatsappURL, '_blank');

    // Oculta o botão após o agendamento
    scheduleButton.style.display = 'none';
}

// Função para exibir o popup com o total e botão do WhatsApp
function showPopup(total, whatsappURL) {
    var popup = document.getElementById('popup');
    var popupTotal = document.getElementById('popup-total');
    var whatsappButton = document.getElementById('whatsapp-button');

    popupTotal.textContent = 'Total: R$ ' + total;
    whatsappButton.href = whatsappURL;

    popup.classList.add('show');
}

// Função para fechar o popup
function closePopup() {
    var popup = document.getElementById('popup');
    popup.classList.remove('show');
}
