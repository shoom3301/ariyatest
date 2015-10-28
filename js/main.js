Backbone.emulateJSON = true;

$(function(){
    /**
     * Модель робота
     * */
    var Robot = Backbone.Model.extend({
        /**
         * @property {number} id ID
         * @property {string} name Имя робота
         * @property {string} type Тип робота
         * @property {number} year ID
         * */
        defaults: {
            id: 0,
            name: '',
            type: '',
            year: 0
        },
        /**
         * @constructor
         * */
        initialize: function(){
            this.view = new RobotView({model: this});
            this.view.render();
        },
        /**
         * Маппинг данных с сервера
         * */
        parse: function(response) {
            if(response && (response.status == 'FOUND' || response.status == 'OK')){
                return response.data;
            }else if(response && response.id){
                return response;
            }else{
                app.notification('Робот с таким ID не найден!', 'warning');
                return false;
            }
        },
        /**
         * Костыль, потому что на сервер данные должны отправляться в ви json строки
         * */
        save: function (attributes, options) {
            options       = options || {};

            options.data  = JSON.stringify(this.toJSON());
            if (options.emulateJSON) {
                options.contentType = 'application/x-www-form-urlencoded';
            }
            return Backbone.Model.prototype.save.call(this, attributes || {}, options);
        }
    });

    /**
     * Отображение робота в списке
     * */
    var RobotView = Marionette.ItemView.extend({
        tagName: 'li',
        template: "#item_tpl",
        events: {
            'click .actions .edit' : 'edit',
            'click .actions .remove' : 'terminate'
        },
        initialize: function(){
            this.model.on("remove", this.destroy, this);
            this.model.on('change', this.render, this);
        },
        /**
         * Редактирование данных робота
         * */
        edit: function(){
            var mdl = this.model;
            app.showModal(EditRobotFormView,
                {
                    title: 'Редактирование робота',
                    actionButton: 'Сохранить',
                    content: $('#robot_form').html(),
                    data: this.serializeData(),
                    action: 'edit'
                }, function(){
                    mdl.save(this.getData(), {
                        success: function (model, response) {
                            if(response && response.status=="OK"){
                                app.notification('Робот "'+mdl.get('name')+'" успешно сохранен!', 'success');
                                app.closeModal();
                            }else{
                                app.notification('Ошибка при редактировании робота!', 'error');
                            }
                        },
                        error: function (model, response) {
                            if(response && response.responseJSON && response.responseJSON.messages){
                                _.each(response.responseJSON.messages, function(msg){
                                    app.notification(msg, 'error');
                                });
                            }else{
                                app.notification('Ошибка при редактировании робота "'+mdl.get('name')+'"!', 'error');
                            }
                            app.closeModal();
                        }
                    });
                });
        },
        /**
         * Удаление робота
         * */
        terminate: function(){
            var mdl = this.model;
            app.showModal(ModalView,
                {
                    title: 'Вы уверены, что хотите удалить робота «'+this.model.get('name')+'»?',
                    actionButton: 'Да',
                    showClose: false
                }, function(){
                    mdl.destroy({success: function(model, response) {
                        app.notification('Робот "'+mdl.get('name')+'" успешно удален!', 'success');
                        app.closeModal();
                    }, error: function(model, response){
                        app.notification('Ошибка при удалении робота "'+mdl.get('name')+'"!', 'error');
                        app.closeModal();
                    }});
                });
        }
    });

    /**
     * Коллекция роботов
     * */
    var Robots = Backbone.Collection.extend({
        list: '#robots_list ul',
        model: Robot,
        url: 'http://frontend.test.pleaple.com/api/robots'
    });

    /**
     * Контроллер приложения
     * */
    var Controller = Marionette.Object.extend({
        /**
         * Получение списка роботов
         * */
        robotsList: function(){
            app.robots.fetch();
        },
        /**
         * Получение робота по id
         * */
        getRobot: function(id){
            app.robots.reset();
            var mdl = app.robots.push({id: id});
            mdl.fetch();
        },
        /**
         * Поиск робота по имени
         * */
        findRobot: function(name){
            $.getJSON('http://frontend.test.pleaple.com/api/robots/search/'+name, function(res){
                if(res && res.length){
                    app.robots.reset();
                    app.robots.add(res);
                }else{
                    app.notification('Робот с таким именем не найден!', 'warning');
                }
            }, function(){
                app.notification('Ошибка при поиске робота!', 'error');
            });
        }
    });

    /**
     * Роутер приложения
     * */
    var Router = Marionette.AppRouter.extend({
        controller: new Controller(),
        appRoutes: {
            "": "robotsList",
            "robot/:id": "getRobot",
            "search/:name": "findRobot"
        }

    });

    /**
     * Приложение
     * */
    var App = Marionette.Application.extend({
        //Скорость анимации
        animateSpeed: 300,
        //Коллекция роботов
        robots: null,
        //Роутер
        router: null,
        //Оповещения
        _messages: [],
        //Показано ли сейчас оповещение
        _messageShowed: false,
        /**
         * @constructor
         * Создается коллекция роботов
         * На коллекцию роботов вешаются слушатели на события добавления и очистки
         * Создается роутер
         * */
        initialize: function() {
            this.robots = new Robots();
            this.robots.on("add", function(robot) {
                $(this.list).append(robot.view.$el);
            })
            .on('reset', function(col, opts){
                _.each(opts.previousModels, function(model){
                    model.trigger('remove');
                });
            });

            this.router = new Router();
        },
        /**
         * Оповещение. Ложить оповещение в очередь и вызывает очередное оповещение.
         * @param {string} text Текст оповещения
         * @param {string} type Тип оповещения
         * @param {number} time Время показа оповещения
         * @param {number} speed Скорость анимации
         * @return {App}
         * */
        notification: function(text, type, time, speed){
            if(text){
                this._messages.push({text: text, type: type, time: time, speed: speed});
                if(!this._messageShowed) this.queueMessage();
            }
            return this;
        },
        /**
         * Вызов очередного оповещения
         * */
        queueMessage: function(){
            if(this._messages.length){
                this._messageShowed = true;

                var th = this;
                var data = this._messages[0];

                data.after = function(){
                    th._messages.shift();
                    th._messageShowed = false;
                    th.queueMessage();
                };

                this.getRegion('infoMessages').show(
                    new InfoMessageView(data)
                );
            }
        },
        /**
         * Показать модальное окно (lightbox)
         * @param {ModalView} _view представление окна
         * @param {object} options параметры
         * @param {function} action событие согласия диалога в окне
         * */
        showModal: function(_view, options, action){
            var th = this;

            var region = this.getRegion('lightBox');

            region.$el.parent().css({display: 'table', opacity: 0}).animate({opacity: 1}, this.animateSpeed);

            var view = new _view(options);

            view.on('action', function(){
                action.apply(this);
            }).on('close', function(){
                th.closeModal();
            });
            region.show(view);
        },
        /**
         * Закрыть текущее модальное окно
         * */
        closeModal: function(){
            var region = this.getRegion('lightBox');
            region.$el.parent().fadeOut(this.animateSpeed, function(){
                region.empty()
            });
        }
    });

    //Приложение
    var app = new App();

    /**
     * При старте приложения запускаем отслеживание истории,
     * инициализируем форму поиска и инициализируем форму добавления робота
     * */
    app.on('start', function() {
        var th = this;

        Backbone.history.start();
        new SearchFormView();

        $('#add_robot_btn').click(function(){
            th.showModal(EditRobotFormView,
                {
                    title: 'Добавление робота',
                    actionButton: 'Добавить',
                    content: $('#robot_form').html(),
                    action: 'add'
                },function(){
                    var new_mdl = th.robots.push(this.getData());
                    delete new_mdl.id;
                    new_mdl.save(null, {
                        success: function (model, response) {
                            if(response && response.status=="OK"){
                                th.notification('Робот успешно добавлен!', 'success');
                                new_mdl.set(response.data);
                                app.closeModal();
                            }else{
                                app.notification('Ошибка при добавлении робота!', 'error');
                            }
                        },
                        error: function (model, response) {
                            if(response && response.responseJSON && response.responseJSON.messages){
                                _.each(response.responseJSON.messages, function(msg){
                                    app.notification(msg, 'error');
                                });
                            }else{
                                app.notification('Ошибка при добавлении робота!', 'error');
                            }
                        }
                    });
                }
            );
        });

        $('#robots_list').find('ul').css('max-height', $(window).height()-$('#header').outerHeight() - $('#robots_filter').outerHeight());
    });

    app.addRegions({
        infoMessages: "#info_messages",
        lightBox: '#light_box .cell'
    });

    /* START */
    app.start();
});