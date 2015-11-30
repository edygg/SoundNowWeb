var audio = $('audio')[0],
    visualWidth = 318,
    visualHeight = 200,
    audioContext = new window.AudioContext(),
    source = audioContext.createMediaElementSource(audio),
    analyser = audioContext.createAnalyser();

source.connect(analyser);
analyser.connect(audioContext.destination);
analyser.fftSize = 2048;
analyser.minDecibels = -90;
analyser.maxDecibels = 0;

var bufferLength = analyser.frequencyBinCount,
    frequencyData = new Uint8Array(bufferLength);

var ScaleBar = {
  min: 0,
  max: visualHeight,
  sum: 0,
  get: function(fromMin, fromMax, valueIn) {
    var toMin = ScaleBar.min,
        toMax = ScaleBar.max;
    fromMin = fromMax * .5;
    var result = ((toMax - toMin) * (valueIn - fromMin)) / (fromMax - fromMin) + toMin;
    return result;
  }
};

var MusicVisuals = {
  call: null,
  start: function() {
    analyser.getByteFrequencyData(frequencyData);

    var scales = [], fd = [];

    var fdMin = Math.min.apply(Math,frequencyData),
        fdMax = Math.max.apply(Math,frequencyData);

    for (var increment = 0; increment < bufferLength; increment++) {
      var y = ScaleBar.get(fdMin, fdMax, frequencyData[increment]);

      fd.push(frequencyData[increment]);

      $(".spectrum .bar:nth-child("+increment+")").css('transform', 'translateY(' + Math.abs(visualHeight - y) + 'px)');
    }

    /*var sc = scales.reduce(function(pv, cv) { return pv + cv; }, 0) / scales.length;
    ScaleBar.sum = fd.reduce(function(pv, cv) { return pv + cv; }, 0) / fd.length;
    sc *= 1.5;*/
    //document.querySelector('.player-spectrum').style.transform = 'scale('+ (sc > .8 ? sc : .8) +')';
    MusicVisuals.call = requestAnimationFrame(MusicVisuals.start);
  },
  stop: function() {
    cancelAnimationFrame(MusicVisuals.call);
  }
};

$('#open-file').on('click', function() {
  $('#file-open').click();
});

$('#file-open').on('change', function(e) {
  var file = e.target.files[0];
  var url = URL.createObjectURL(file);
  audio.src = url;
  $('.box.title').hide();

  ID3.clearAll();

  ID3.loadTags(url, function() {
    var tags = ID3.getAllTags(url);
    document.querySelector('#artist').innerHTML = tags.artist === undefined ? fileInfo.artist : tags.artist;
    document.querySelector('#song').innerHTML = tags.title === undefined ? fileInfo.title : tags.title ;
    var image = tags.picture;
    if (image) {
      var base64String = '';
      for (var i = 0; i < image.data.length; i++) {
        base64String += String.fromCharCode(image.data[i]);
    }
    var pic = new Image();
    pic.onload = function() {
      var colorThief = new ColorThief();
      var palette = colorThief.getPalette(pic, 2);
      $('.bar').css('background-color', 'rgb(' + palette[0].join(',') + ')');
      $('.controls').css('background-color', 'rgb(' + palette[0].join(',') + ')');
      $('.site').css('background-color', 'rgb(' + palette[1].join(',') + ')');
      $('.site').css('color', 'rgb(' + palette[0].join(',') + ')');
      $('#progress-bar').css('background-color', 'rgb(' + palette[1].join(',') + ')');
      $('#play-pause-button').css('color', 'rgb(' + palette[1].join(',') + ')');
      $('#open-file').css('background-color', 'rgb(' + palette[0].join(',') + ')');
      $('#open-file').css('color', 'rgb(' + palette[1].join(',') + ')');
    };
    pic.src = "data:" + image.format + ";base64," + window.btoa(base64String);
    $('#cover')[0].src = "data:" + image.format + ";base64," + window.btoa(base64String);
    }
  }, {
      dataReader: FileAPIReader(file),
      tags: ['artist', 'album', 'title', 'picture']
  });

  audio.play();
});

$('#play-pause-button').on('click', function() {
  audio.paused ? audio.play() : audio.pause();
});

$('audio').on('play', function() {
  $('#play-pause-button span').html('pause');
  MusicVisuals.start();
});

$('audio').on('pause', function() {
  $('#play-pause-button span').html('play_arrow');
  MusicVisuals.stop();
});

$('audio').on('ended', function() {
  MusicVisuals.stop();
});

var progressWidth = $('.progress').width();

$('audio').on('timeupdate', function() {
  var p = (audio.currentTime / audio.duration) * 100;
  $('#progress-bar').css('width', p + '%');
});

$('.progress').on('click', function(e) {
  var mouseX = e.pageX;
  var barX = $(this).position().left;
  var percent = $(this).width() / (e.pageX - barX);
  audio.currentTime = audio.duration / percent;
});