/**
 * Created by Shoom on 28.10.15.
 */

/**
 * Модальное окно
 * */
var ModalView = Marionette.ItemView.extend({
    template: '#modal_tpl',
    className: 'modal',
    events: {
        "click .title .close": 'close',
        "click .actions .cancel": 'close',
        "click .actions .actionButton": 'action'
    },
    /**
     * Закрытие модального окна
     * */
    close: function(){
        this.trigger('close');
    },
    /**
     * Триггеринг события диалога
     * */
    action: function(){
        this.trigger('action');
    },
    /**
     * Сериализация данных для рендеринга
     * @return {object}
     * */
    serializeData: function () {
        return {
            title: this.options.title||'',
            actionButton: this.options.actionButton||'OK',
            cancelButton: this.options.cancelButton||'Отмена',
            content: this.options.content||'',
            showClose: typeof this.options.showClose=='undefined'?true:this.options.showClose
        };
    }
});

/**
 * Форма редактирования робота
 * */
var EditRobotFormView = ModalView.extend({
    id: 'robot_form',
    /**
     * Если в кноструктор переданны данные модели, то вставляем их в соот. инпуты
     * */
    onRender: function(){
        if(this.options.data){
            for(var key in this.options.data){
                if(this.options.data.hasOwnProperty(key)){
                    this.setInputVal(key, this.options.data[key]);
                }
            }
        }
    },
    /**
     * Получение данных формы
     * */
    getData: function(){
        return {
            name: this.getInputValByName('name'),
            type: this.getInputValByName('type'),
            year: this.getInputValByName('year')
        };
    },
    /**
     * Назначить данные input'ам
     * @param {string} name имя input'a
     * @param {string} val значение
     * @return {EditRobotFormView}
     * */
    setInputVal: function(name, val){
        this.getInputByName(name).val(val);
        return this;
    },
    /**
     * Получить значение input'a
     * @param {string} name имя input'a
     * @return {string} значение
     * */
    getInputValByName: function(name){
        return this.getInputByName(name).val();
    },
    /**
     * Получить input
     * @param {string} name имя input'a
     * @return {jQuery}
     * */
    getInputByName: function(name){
        return this.$el.find('.content input[name="'+name+'"], .content select[name="'+name+'"]');
    }
});

/**
 * Информационное сообщение
 * */
var InfoMessageView = Marionette.ItemView.extend({
    className: 'info_msg',
    template: "#info_message_tpl",
    events: {
        "click .close" : "end"
    },
    //таймер
    timer: null,
    //время таймера
    time: 4000,
    //скорость анимации
    speed: 300,
    /**
     * Показываем DOM элемент и запускаем таймер, по которому он закроется
     * */
    onRender: function(){
        var th = this;

        if(this.options.type) this.$el.addClass(this.options.type);
        if(this.options.time) this.time = this.options.time;
        if(this.options.speed) this.speed = this.options.speed;

        this.$el.fadeIn(this.speed, function(){
            th.timer = setInterval(function(){
                th.end();
            }, th.time);
        });
    },
    /**
     * Данные для рендеринга
     * @return {object}
     * */
    serializeData: function () {
        return {
            text: this.options.text||''
        };
    },
    /**
     * Закрытие оповещения
     * Прячется DOM элемент и удаляется представление
     * */
    end: function(){
        var th = this;

        clearInterval(this.timer);

        this.$el.fadeOut(this.speed, function(){
            th.destroy();
        });
    },
    /**
     * По удалению представления вызвать соответствующий callback
     * */
    onDestroy: function(){
        this.options.after();
    }
});

/**
 * Форма поиска
 * */
var SearchFormView = Marionette.ItemView.extend({
    el: '#robots_filter',
    events: {
        'click button[name="find"]' : 'find',
        'keydown input[name="name"]' : 'clearId',
        'keydown input[name="id"]' : 'clearName'
    },
    /**
     * @constructor
     * */
    initialize: function(){
        this.$name = this.$el.children('input[name="name"]');
        this.$id = this.$el.children('input[name="id"]');
    },
    /**
     * Поиск роботов соответственно запросу
     * */
    find: function(){
        var id_val = this.$id.val();
        var name_val = this.$name.val();

        if(id_val){
            location.hash="robot/"+id_val;
        }else if(name_val){
            location.hash="search/"+name_val;
        }else{
            location.hash="";
        }
    },
    /**
     * Очистка поля id
     * */
    clearId: function(){
        this.$id.val('');
    },
    /**
     * Очистка поля name
     * */
    clearName: function(){
        this.$name.val('');
    }
});