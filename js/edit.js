// js/edit.js

// Configuração do Firebase
// Certifique-se de substituir as configurações abaixo pelas suas próprias configurações do Firebase

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

    // Array para armazenar as seleções temporárias
    var selectedSlots = [];

    // Variável para armazenar o evento atual sendo editado
    var currentEvent = null;

    // Inicializa o calendário
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile() ? 'timeGridDay' : 'timeGridWeek',
        locale: 'pt-br',
        timeZone: 'local',
        height: 'auto',
        nowIndicator: true,
        isLongPress: true,
        allDaySlot: false,
        slotDuration: '00:30:00', // Mantido consistente
        slotLabelInterval: '01:00',
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,listWeek' 
        },
        editable: true,
        selectable: true, // Desabilita seleção via arrastar em dispositivos móveis
        selectOverlap: false,
        eventOverlap: false,
        select: function(info) {
            // Handler para seleção em desktops
            handleSelection(info.start, info.end);
            calendar.unselect();
        },
        dateClick: function(info) {
            if (isMobile()) {
                // Handler para seleção em dispositivos móveis
                var start = info.date;
                var end = new Date(start.getTime() + 30 * 60 * 1000); // Adiciona 30 minutos
                handleSelection(start, end);
            }
        },
        eventClick: function(info) {
            if (info.event.title === 'Selecionado') {
                // Remove da lista de seleções temporárias
                selectedSlots = selectedSlots.filter(function(slot) {
                    return !(slot.start.getTime() === info.event.start.getTime() && slot.end.getTime() === info.event.end.getTime());
                });

                // Remove o evento do calendário
                info.event.remove();

                // Oculta o botão se não houver mais seleções
                if (selectedSlots.length === 0) {
                    registerButton.classList.add('hidden');
                }
            } else {
                // Evento existente, abrir popup de edição
                currentEvent = info.event; // Armazena o evento atual
                document.getElementById('edit-event-title').value = info.event.title; // Preenche o input com o título atual
                openEditPopup(); // Abre o popup de edição
            }
        },
        events: []
    });

    // Adiciona classe ao calendário em dispositivos móveis
    if (isMobile()) {
        calendarEl.classList.add('mobile-calendar');
    }

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

    // Função para lidar com a seleção de horários
    function handleSelection(start, end) {
        // Verifica se já há um slot selecionado na faixa
        var overlap = selectedSlots.some(function(slot) {
            return (start < slot.end && end > slot.start);
        });

        if (overlap) {
            alert('Esse horário já está selecionado.');
            return;
        }

        // Adiciona o slot à lista de seleções
        selectedSlots.push({ start: start, end: end });

        // Adiciona um evento para destacar a seleção
        calendar.addEvent({
            title: 'Selecionado',
            start: start,
            end: end,
            allDay: false,
            color: '#d81b60', // Alinhado com a paleta
            classNames: ['selected-slot'],
            overlap: false
        });

        // Mostra o botão de registrar disponibilidade
        registerButton.classList.remove('hidden');

        // Mantém o botão sempre visível em dispositivos móveis
        if (isMobile()) {
            registerButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

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

    // Função para abrir o popup de edição
    window.openEditPopup = function() {
        var editPopup = document.getElementById('edit-popup');
        editPopup.classList.add('show');
    };

    // Função para fechar o popup de edição
    window.closeEditPopup = function() {
        var editPopup = document.getElementById('edit-popup');
        editPopup.classList.remove('show');
        currentEvent = null; // Limpa o evento atual
    };

    // Função para salvar as alterações do evento
    window.saveEvent = function() {
        var newTitle = document.getElementById('edit-event-title').value.trim();

        if (newTitle === '') {
            alert('Por favor, insira o nome do evento.');
            return;
        }

        if (currentEvent) {
            // Atualiza o título no Firebase
            var eventId = currentEvent.id;
            firebase.database().ref('events/' + eventId).update({
                title: newTitle
            }).then(function() {
                // Atualiza o título no calendário
                currentEvent.setProp('title', newTitle);
                alert('Evento atualizado com sucesso!');
                closeEditPopup();
            }).catch(function(error) {
                console.error('Erro ao atualizar o evento:', error);
                alert('Ocorreu um erro ao atualizar o evento.');
            });
        }
    };

    // Função para remover o evento
    window.deleteEvent = function() {
        if (currentEvent) {
            if (confirm('Tem certeza de que deseja remover este evento?')) {
                var eventId = currentEvent.id;
                firebase.database().ref('events/' + eventId).remove()
                    .then(function() {
                        currentEvent.remove(); // Remove do calendário
                        alert('Evento removido com sucesso!');
                        closeEditPopup();
                    })
                    .catch(function(error) {
                        console.error('Erro ao remover o evento:', error);
                        alert('Ocorreu um erro ao remover o evento.');
                    });
            }
        }
    };

    // Ajusta a visualização e configurações ao redimensionar a janela
    window.addEventListener('resize', function() {
        var wasMobile = calendarEl.classList.contains('mobile-calendar');
        var nowMobile = isMobile();

        if (wasMobile && !nowMobile) {
            calendarEl.classList.remove('mobile-calendar');
            calendar.changeView('timeGridWeek');
            calendar.setOption('selectable', true);
        } else if (!wasMobile && nowMobile) {
            calendarEl.classList.add('mobile-calendar');
            calendar.changeView('timeGridDay');
            calendar.setOption('selectable', false);
        }
    });
}
