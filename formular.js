var Formular;

(function($) {

Formular = new Class({

  Extends : Form.Validator,

  options : {

    onBeforeSubmit : $empty,
    onAfterSubmit : $empty,
    onSuccess : $empty,
    onFailure : $empty,
    onFieldSuccess : $empty,
    onFieldFailure : $empty,
    onFocus : $empty,
    onBlur : $empty,

    theme : 'red',
    tipOffset : {
      x : -10,
      y : 0
    },
    allowClose : true,
    animateFields : true,
    validationFailedAnimationClassName : 'formular-validation-failed',
    fieldSelectors : 'input.required',
    allFieldSelectors : 'input[type="text"],textarea,select',
    errorClassName : 'formular-inline',
    disableClassName : 'disabled',
    warningPrefix : 'There was an error: ',
    submitFormOnSuccess : false,
    disableFieldsOnSuccess : true,
    disableButtonsOnSuccess : true,
    inputEscapeKeyEvent : true,
    repositionBoxesOnWindowResize : true,
    repositionBoxesOnWindowScroll : true,
    serial : true,
    oneErrorAtATime : true,
    scrollToFirstError : true,
    focusOnFirstError : true,
    stopSubmissionRequestOnCancel : true,
    boxZIndex : 1000
  },

  initialize : function(form,options) {
    this.form = $(form);
    this.form.addClass('formular');
    this.form.addEvent('submit',function(event) {
      if(!this.options.submitFormOnSuccess) {
        event.preventDefault();
      }
      else {
        this.hasSubmitted = true;
      }
    }.bind(this));

    options = options || {};
    options.onFormValidate = this.onFormValidate.bind(this);
    options.onElementPass = this.onElementPass.bind(this);
    options.onElementFail = this.onElementFail.bind(this);

    this.scroller = new Fx.Scroll(window);

    this.parent(this.form,options);
    this.setTheme(this.options.theme);
    if(this.options.inputEscapeKeyEvent) {
      var fields = this.getFields();
      fields.addEvents({
        'focus' : function(event) {
          var input = $(event.target);
          this.activeInput = input;
        }.bind(this),
        'blur' : function() {
          var input = $(event.target);
          if(this.activeInput && this.activeInput == input) {
            this.activeInput = null;
          }
        }.bind(this),
        'keydown' : function(event) {
          var input = $(event.target);
          var key = event.key;
          if(input && this.activeInput == input && key == 'esc') {
            this.hideError(input);
          }
        }.bind(this)
      });
    }

    if(this.options.repositionBoxesOnWindowResize) {
      window.addEvent('resize',this.repositionBoxes.bind(this));
    }
    if(this.options.repositionBoxesOnWindowScroll) {
      document.addEvent('scroll',this.repositionBoxes.bind(this));
    }
  },

  setTheme : function(theme) {
    for(var i in this.boxes) {
      var box = this.boxes[i];
      box.removeClass(this.getThemeClassName()).addClass('formular-' + theme);
    }
    this.options.theme = theme;
  },

  getTheme : function() {
    return this.options.theme;
  },

  getThemeClassName : function() {
    return 'formular-' + this.getTheme();
  },

  repositionBoxes : function() {
    var boxes = this.boxes;
    for(var i in boxes) {
      var box = boxes[i];
      var element = box.retrieve('element');
      if(box.getStyle('display','block')) {
        this.positionErrorBox(box,element);
      } 
    }
  },

  getForm : function() {
    return this.form;
  },

  getAllFields : function() {
    return this.getForm().getElements(this.options.allFieldSelectors);
  },

  getButtons : function() {
    return $(this.getForm()).getElements('input[type="submit"],button,input[type="button"],input[type="reset"]');
  },

  disableButtons : function() {
    this.getButtons().setProperty('disabled',1);
  },

  enableButtons : function() {
    this.getButtons().setProperty('disabled',0);
  },

  disableFields : function() {
    this.getAllFields().each(function(field) {
      field.addClass(this.options.disableClassName);
      field.setProperty('readonly','1');
    },this);
  },

  enableFields : function() {
    this.getFields().each(function(field) {
      field.removeClass(this.options.disableClassName);
      field.setProperty('readonly','0');
    },this);
  },

  //this method is overriden so that we can have the oneErrorAtATime feature
	validateField: function(field, force) {
    if(this.options.oneErrorAtATime && this.anyErrorBoxesVisible()) {
      var box = this.getFirstVisibleErrorBox();
      if(box) {
        var element = box.retrieve('element');
        if(element != field) {
          return false; 
        }
      }
    }
    return this.parent(field,force);
  },

  setBoxZIndex : function(zIndex) {
    this.options.boxZIndex = zIndex;
    for(var i in this.boxes) {
      var box = this.boxes[i];
      if(box && box.setStyle) {
        box.setStyle('z-index',zIndex);
      }
    }
  },

  getBoxZIndex : function() {
    return this.options.boxZIndex;
  },

  createErrorBox : function(element) {
    var elm = new Element('div',{
      'class':this.options.errorClassName + ' ' + this.getThemeClassName(),
      'styles':{
        'position':'absolute',
        'display':'none',
        'z-index':this.getBoxZIndex()
      }
    });

    var close = '';
    if(this.options.allowClose) {
      close = '<div class="close"></div>';
    }
    var contents = '<table>'+
                   '<tr>'+
                   '<td class="tl x xy"></td>'+
                   '<td class="t y"></td>'+
                   '<td class="tr x xy"></td>'+
                   '</tr>'+
                   '<tr>'+
                   '<td class="l x"></td>'+
                   '<td class="c">'+close+'<div class="txt"></div></td>'+
                   '<td class="r x"></td>'+
                   '</tr>'+
                   '<tr>'+
                   '<td class="bl x xy"></td>'+
                   '<td class="b y"></td>'+
                   '<td class="br x xy"></td>'+
                   '</tr>'+
                   '</table>';
    elm.set('html',contents);
    elm.store('element',element);

    if(this.options.allowClose) {
      close = elm.getElement('.close');
      if(close) {
        close.addEvent('click',function(event) {
          event.stop();
          var box = $(event.target).getParent('.'+this.options.errorClassName);
          var element = box.retrieve('element');
          if(box) {
            this.blur();
            this.hideError(element);
          }
        }.bind(this));
      }
    }

    return elm;
  },

  blur : function() {
    this.getFields()[0].blur();
  },

  getErrorBox : function(element) {
    if(!this.boxes) {
      this.boxes = {};
    }
    var id = element.id;
    if(!this.boxes[id]) {
      var box = this.createErrorBox(element);
      box.injectInside(document.body);

      this.boxes[id] = box;
    }
    return this.boxes[id];
  },

  getFirstVisibleErrorBox : function() {
    for(var i in this.boxes) {
      var box = this.boxes[i];
      if(box.getStyle('display') == 'block') {
        return box;
      }
    }
  },

  getErrorBoxMessage : function(box) {
    return box.getElement('.txt').get('html');
  },

  setErrorBoxMessage : function(box,message) {
    message = '<em class="formular-prefix">' + this.options.warningPrefix + '</em>' + message;
    box.getElement('.txt').set('html',message);
  },

  positionErrorBox : function(box,element) {
    if(!element) return;
    var sizes = box.getDimensions();
    var coords = element.getCoordinates();
    var CENTER_TIP_POSITION_X = -40;
    var offsetX = CENTER_TIP_POSITION_X + this.options.tipOffset.x;
    var offsetY = this.options.tipOffset.y;
    box.setStyles({
      'top' : coords.top - sizes.height + offsetY,
      'left' : coords.left + coords.width + offsetX 
    });
  },

  destroyAllBoxes : function() {
    var boxes = this.boxes;
    for(var i in boxes) {
      var box = boxes[i];
      box.destroy();
    }
  },

  showError : function(element,message) {
    var box = this.getErrorBox(element);
    if(box) {
      var old = this.getErrorBoxMessage(box);
      this.setErrorBoxMessage(box,message);
      this.positionErrorBox(box,element);
      if(box.getStyle('display') != 'block') {
        box.setStyles({
          'opacity':0,
          'display':'block'
        }).tween('opacity',1);
      }
      else if(old != message) { 
        box.setOpacity(0.5).fade(1);
      }
    }
  },

  hideError : function(element) {
    var box = this.getErrorBox(element);
    if(box) {
      if(box.getStyle('display') == 'block') {
        new Fx.Morph(box).start({
          'opacity':0
        }).chain(function() {
          box.setStyle('display','none');
        });
      }
    }
  },

  anyErrorBoxesVisible : function() {
    for(var i in this.boxes) {
      var box = this.boxes[i];
      if(box.getStyle('display') == 'block') {
        return true;
      }
    }
    return false;
  },

  hideAllErrors : function() {
    for(var i in this.boxes) {
      var box = this.boxes[i];
      var element = box.retrieve('element');
      this.hideError(element);
    }
  },

  onFormValidate : function(pass) {
    if(pass) {
      this.onValidationSuccess();
    }
    else { //there must exist an error
      if(this.options.focusOnFirstError) {
        this.focusOnFirstVisibleError(); 
      }
      if(this.options.scrollToFirstError) {
        this.scrollToFirstVisibleError();
      }
    }
  },

  scrollToFirstVisibleError : function() {
    var box = this.getFirstVisibleErrorBox();
    this.scroller.toElement(box);
  },

  focusOnFirstVisibleError : function() {
    var box = this.getFirstVisibleErrorBox();
    var input = box.retrieve('element');
    input.focus();
  },

  onValidationSuccess : function() {
    if(this.options.disableFieldsOnSuccess) {
      this.disableFields();
    }
    if(this.options.disableButtonsOnSuccess) {
      this.disableButtons();
    }
    this.fireEvent('success');
    this.submitting = !!this.hasSubmitted;
  },

  onElementPass : function(element) {
    this.hideError(element);
    var klass = this.options.validationFailedAnimationClassName;
    if(klass && element.hasClass(klass)) {
      element.removeClass(klass);
    }
  },

  onElementFail : function(element,validators) {
    var val = validators[0];
    if(val) {

      if(this.options.oneErrorAtATime && this.anyErrorBoxesVisible()) {
        var visible = this.getFirstVisibleErrorBox();
        if(visible.retrieve('element') != element) {
          return;
        }
      }

      var validator = this.getValidator(val);
      if(validator) {
        var error = validator.getError(element);
        this.onElementError(element,error);
      }
    }
  },

  onElementError : function(element,message) {
    this.showError(element,message);
    var klass = this.options.validationFailedAnimationClassName;
    if(klass) {
      if(this.options.animateFields) {
        var existingStyles = element.retrieve('existingStyles',element.style);
        var m = element.get('morph');
        m.start('.'+klass).chain(function() {
          element.addClass(klass);
          element.setProperty('style',existingStyles);
        });
      }
      else {
        element.addClass(klass);
      }
    }

  },

  validateFieldset : function(fieldset) {
    var fieldset = $(fieldset) || this.getForm().getElement('[name="'+fieldset+'"]');
    if(fieldset) {
      var inputs = fieldset.getElements(this.options.fieldSelectors);
      return this.validateFields(inputs);
    }
    return false;
  },

  validateFields : function(fields) {
		var result = $$(fields).map(function(field){
			var c = this.validateField(field, true);
      return c;
		}, this).every(function(v){
			return v;
		});
    return result;
  },

  isSubmitting : function() {
    return this.submitting;
  },

  submit : function() {
    this.validate();
  },

  cancel : function() {
    if(this.isSubmitting() && this.options.stopSubmissionRequestOnCancel) {
      window.ie ? document.execCommand('Stop') : window.stop();
    }
    this.enableFields();
    this.enableButtons();
    this.reset();
    this.hideAllErrors();
    this.submitting = this.hasSubmitted = false;
  },

  destroy : function() {
    this.reset();
    this.destroyAllBoxes();
    this.getForm().store('Formular',null);
    this.getForm().destroy();
  }

});

})(document.id);