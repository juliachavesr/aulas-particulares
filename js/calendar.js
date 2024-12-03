// js/calendar.js

// Função para verificar se o dispositivo é móvel
function isMobile() {
    return window.innerWidth <= 768;
}

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var requestButton = document.getElementById('request-appointment-button');
    var appointmentPopup = document.getElementById('appointment-popup');
    var appointmentSummary = document.getElementById('appointment-summary');
    var totalValue = document.getElementById('total-value');
    var contactButton = document.getElementById('contact-button');

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
        selectable: true,
        longPressDelay: 0,
        selectLongPressDelay: 0, 
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

            // Ordena os slots selecionados
            selectedSlots.sort(function(a, b) {
                return a.start - b.start;
            });

            // Adiciona um evento para destacar a seleção com cor mais forte
            calendar.addEvent({
                title: 'Selecionado',
                start: info.start,
                end: info.end,
                allDay: false,
                color: '#ff4081', // Cor mais forte
                overlap: false
            });

            // Mostra o botão de solicitar agendamento
            requestButton.classList.remove('hidden');

            calendar.unselect();

            // Mantém o botão sempre visível em dispositivos móveis
            if (isMobile()) {
                requestButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
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
                    requestButton.classList.add('hidden');
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

    // Função para abrir o popup de agendamento
    window.openAppointmentPopup = function() {
        if (selectedSlots.length === 0) {
            alert('Por favor, selecione pelo menos um horário.');
            return;
        }

        var summaryText = '';
        var total = 0;

        // Ordena os slots selecionados
        selectedSlots.sort(function(a, b) {
            return a.start - b.start;
        });

        // Agrupa slots consecutivos
        var groupedSlots = [];
        var groupStart = selectedSlots[0].start;
        var groupEnd = selectedSlots[0].end;

        for (var i = 1; i < selectedSlots.length; i++) {
            var currentSlot = selectedSlots[i];
            var previousSlot = selectedSlots[i - 1];

            // Verifica se o slot atual é consecutivo ao anterior
            if (currentSlot.start.getTime() === previousSlot.end.getTime()) {
                groupEnd = currentSlot.end;
            } else {
                // Adiciona o grupo anterior à lista
                groupedSlots.push({ start: groupStart, end: groupEnd });
                // Inicia um novo grupo
                groupStart = currentSlot.start;
                groupEnd = currentSlot.end;
            }
        }
        // Adiciona o último grupo à lista
        groupedSlots.push({ start: groupStart, end: groupEnd });

        // Gera o resumo dos horários agrupados
        groupedSlots.forEach(function(slot) {
            var start = moment(slot.start).format('DD/MM/YYYY HH:mm');
            var end = moment(slot.end).format('DD/MM/YYYY HH:mm');
            summaryText += `Data e Hora: ${start} até ${end}\n`;
            var duration = moment.duration(slot.end - slot.start);
            var hours = duration.asHours();
            total += hours * 50; // R$ 50,00 por hora
        });

        appointmentSummary.textContent = summaryText;
        totalValue.textContent = `Valor Total: R$ ${total.toFixed(2)}`;

        // Gera a mensagem para o botão de contato
        var whatsappMessage = encodeURIComponent(
            `Olá, gostaria de agendar uma aula.\n\n` +
            `${summaryText}\n` +
            `Valor total: R$ ${total.toFixed(2)}`
        );

        var whatsappNumber = '5581999298108'; // Substitua pelo número da professora
        var whatsappURL = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
        contactButton.href = whatsappURL;

        // Exibe o popup
        appointmentPopup.classList.add('show');
    };

    // Função para fechar o popup de agendamento
    window.closeAppointmentPopup = function() {
        appointmentPopup.classList.remove('show');
    };

    // Função para modificar a seleção (fechar o popup)
    window.modifySelection = function() {
        closeAppointmentPopup();
    };
});
