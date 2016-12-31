function Point(x, y, center) {
    this.x = x;
    this.y = y;
}

Point.prototype = {

    constructor:Point,

    inside:function(x, y, context){
        context.beginPath();
        context.arc(this.x, this.y, 8, 0, Math.PI*2, true);
        return context.isPointInPath(x, y);
    },

    draw:function(context, radius = 8, fill=true, color="blue"){
        context.beginPath();
        context.arc(this.x, this.y, radius, 0, Math.PI*2, true);
        context.fillStyle = color;
        context.fill()
        context.strokeStyle = "black";
        context.stroke();
    },

    toString:function(){
        return "(" + this.x + "," + this.y + ")";
    },

    subtract:function(p){
        return new Vector(this.x-p.x, this.y-p.y);
    },

    equals:function(point){
        return (this.x == point.x && this.y == point.y);
    }
}

function Vector(x, y){
    this.x = x;
    this.y = y;
}

Vector.prototype = {
    constructor:Vector,

    dot:function(v){
        return this.x*v.x + this.y*v.y;
    },

    cross:function(v){
        return this.x*v.y - this.y*v.x;
    }
}

function Obstacle(points) {
    this.points = points;
}


Obstacle.prototype = {
    constructor:Obstacle,

    move:function (dx, dy){
        pts = this.points;
        for(var i=0; i<pts.length; i++){
            pt = pts[i];
            pt.x = pt.x + dx;
            pt.y = pt.y + dy;
        }
    },

    inside:function (x, y, context){
        pts = this.points;
        context.moveTo(pts[0].x, pts[0].y);
        for(var i=1; i<pts.length; i++) {
            context.lineTo(pts[i].x, pts[i].y);
        }
        return context.isPointInPath(x, y);
    },

    draw:function(context){
        pts = this.points;
        context.beginPath();
        context.moveTo(pts[0].x, pts[0].y);
        for(var i=1; i<pts.length; i++){
            context.lineTo(pts[i].x, pts[i].y);
        }
        context.fillStyle = "#3f3f3f";
        context.fill();
        context.strokeStyle = "black";
        context.stroke();
    },

    toString:function(){
        pts = this.points;
        st = "[";
        for(var i=0; i<pts.length; i++){
           st+=pts[i].toString();
        }
        st+="]";
        return st;
    }
}

function Segment(point1, point2, obstacle){
    this.point1 = point1;
    this.point2 = point2;
    this.obstacle = obstacle;
}

Segment.prototype = {
    constructor:Segment,

    toString:function(){
        return "["+this.point1.toString()+", "+this.point2.toString()+"]"+this.obstacle.toString();
    },

    pts:function(){
        return "["+this.point1.toString()+", "+this.point2.toString()+"]";
    }
}

function SortedArray(center){
    this.center = center;
    this.points = [];
}

SortedArray.prototype = {
    constructor:SortedArray,

    add:function(point){
        a = this.angle(point);
        point.angle = a;
        index = this.find(point).index;
        this.points.splice(index, 0, point)
    },

    remove:function(point){
        index = this.find(point).index;
        this.points.splice(index, 1);
    },

    find:function(point, specific=true){
        var minIndex = 0;
        var maxIndex = this.points.length -1;
        var currentIndex;
        var currentPoint;

        while (minIndex <= maxIndex) {
            currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentPoint = this.points[currentIndex];

            if(currentPoint.angle < point.angle){
                minIndex = currentIndex + 1;
            }

            else if (currentPoint.angle > point.angle){
                maxIndex = currentIndex - 1;
            }

            else{
                re = this.getSpecific(point, currentIndex);
                if(re && specific){
                    return {
                        found:true,
                        index:this.getSpecific(point, currentIndex)
                    };
                }
                else{
                    return {
                        found:false,
                        index:currentIndex+1
                    }
                }
            }
        }
        if(currentPoint){
            return {
                found:false,
                index: currentPoint.angle < point.angle ? currentIndex + 1: currentIndex
            };
        }
        else{
            return {
                found:false,
                index:0
            };
        }
    },

   getSpecific:function(point, index){
        var currentIndex = index;
        var currentElement = this.points[currentIndex];
        while(currentIndex < this.points.length && currentElement.angle == point.angle){
            if(currentElement == point){
                return currentIndex;
            }
            currentIndex++;
            currentElement = this.points[currentIndex];
        }
        currentIndex = index - 1;
        currentElement = this.points[currentIndex];
        while(currentIndex >= 0 && currentElement.angle == point.angle){
            if(currentElement == point){
                return currentIndex;
            }
            currentIndex--;
            currentElement = this.points[currentIndex];
        }
    },

    angle:function(point){
        an = Math.atan2(point.y - this.center.y, point.x - this.center.x);
        if(an<0){
            return 2*Math.PI + an;
        }
        else{
            return an;
        }
    },

    modifyObstacle:function(obstacle){
        for(var i = 0; i<obstacle.points.length; i++){
            this.remove(obstacle.points[i]);
            this.add(obstacle.points[i]);
        }
    },

    toString:function(){
        st ="";
        for (var i = 0; i<this.points.length; i++){
            st+="("+this.points[i].x+","+this.points[i].y+" angle:"+this.points[i].angle+") ";
        }
        return st;
    },

    length:function(){
        return this.points.length
    },


}

function VisibilityPolygon(context, canvas, point, obstacles){
    this.point = point;
    this.canvas = canvas;
    this.segments = new Array();
    this.center = new Point(canvas.width/2, canvas.height/2);
    this.obstacles = obstacles;
    this.obstPoints = new SortedArray(new Point(canvas.width/2, canvas.height/2));
    boundary = new Obstacle([new Point(0, 0), new Point(canvas.width, 0), new Point(canvas.width, canvas.height), new Point(0, canvas.height), new Point(0,0)]);
    this.addObstacle(boundary);
    this.addObstacles(obstacles);
    this.compute();
}

VisibilityPolygon.prototype = {
    constructor:VisibilityPolygon,

    addObstacle:function(obstacle){
        pts = obstacle.points;
        for(var i = 1; i < pts.length; i++){
            var pt1 = new Point(pts[i-1].x, pts[i-1].y);
            var pt2= new Point(pts[i].x, pts[i].y);
            var seg = new Segment(pt1, pt2);
            pt1.segment = seg;
            pt2.segment = seg;
            console.log(seg.pts());
            seg.obstacle = obstacle;
            this.segments.push(seg);
            this.obstPoints.add(pt1);
            this.obstPoints.add(pt2);
        }
    },

    modifyObstacle:function(obstacle){
        this.obstPoints.modifyObstacle(obstacle);
        this.compute();
    },

    addObstacles:function(obstacles){
        for(var i = 0; i<obstacles.length; i++){
            this.addObstacle(obstacles[i]);
        }
    },

    distance:function(p1, p2){
        return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
    },

    intersection:function(ray, segment){
        console.log(segment.pts());
        var p1 = segment.point1;
        var p2 = segment.point2;
        if(Math.abs(p1.angle - ray.angle) < .001){
            return p1;
        }
        if(Math.abs(p2.angle - ray.angle) < .001){
            return p2;
        }
        var dx = Math.cos(ray.angle);
        var dy = Math.sin(ray.angle);
        var v1 = ray.point.subtract(p1);
        var v2 = p2.subtract(p1);
        var v3 = new Vector(-dy, dx);
        var dot = v2.dot(v3);
        if(Math.abs(dot) < 0.000001){
            return null;
        }
        var t1 = v2.cross(v1) / dot;
        var t2 = v1.dot(v3)/dot;

        if(t1>=0 && (t2>= 0 && t2 <=1)){
            x = ray.point.x + dx * t1;
            if(x<.00001){
                x=0;
            }
            y = ray.point.y + dy * t1;
            if(y<.00001){
                y=0;
            }
            return new Point(x, y);
        }
        return null;
    },

    closer:function(segment1, segment2){
        var side1 = this.side(segment1, this.point)
        var side2 = this.side(segment1, segment2.point1)
        var side3 = this.side(segment1, segment2.point2)
        if((side1 != side2 && side2 != 0)|| (side1 != side3 && side3 != 0)){
            return segment1;
        }
        else{
            return segment2;
        }
    },

    distFromLine:function(segment){
        p1 = segment.point1;
        p2 = segment.point2;
        distance = Math.abs((p2.y-p1.y)*this.point.x-(p2.x-p1.x)*this.point.y+p2.x*p1.y-p2.y*p1.x)/Math.sqrt(Math.pow((p2.y-p1.y),2)+Math.pow((p2.x-p1.x),2));
        return distance;
    },

    initialSegments:function(ray){
        s = new Array();
        var minSeg;
        var minInt;
        var minDistance;
        var counter = 0;
        for(var i=0; i<this.segments.length; i++){
            var seg = this.segments[i];
            var inter = this.intersection(ray, seg);
            if (inter){
                s[seg.toString()] = seg;
                counter++;
                if(minSeg){
                    c = this.closer(seg, minSeg);
                    if(c.segment != minSeg){
                        minDistance = c.distance
                        minSeg = c.segment;
                        minInt = inter;
                    }
                }
                else{
                    minDistance = this.distFromLine(seg);
                    minSeg = seg;
                    minInt = inter;
                }
            }
        }
        s['length']=counter;
        return {segments:s, segment:minSeg, intersection:minInt, distance:minDistance};
    },

    minSegment:function(segs, ray){
        var minDistance = 100000000;
        var minSeg;
        var minInter;
        for(var key in segs){
            var s = segs[key];
            var inter = this.intersection(ray, s);
            if(minSeg){
                var c = this.closer(s, minSeg);
                if(c != minSeg){
                    minSeg = c;
                    minInter = inter;
                }
            }
            else{
                minSeg = s;
                minInt = inter;
            }
        }
        return {segment:minSeg,  point:minInter};
    },

    updateSegment:function(sgs, sg){
        if(sg.toString() in sgs){
            delete sgs[sg.toString()];
            sgs['length'] = sgs['length'] - 1;
            return {delete:true};
        }
        else{
            sgs[sg.toString()]=sg;
            sgs['length'] = sgs['length'] + 1;
            return {delete:false};
        }
    },

    addPoint:function(point, lastPoint, points){
        if(!lastPoint.equals(point)){
            points.push(point);
        }
    },

    side:function(segment, point){
        var p1 = segment.point1;
        var p2 = segment.point2;
        var d1 = p1.x - point.x;
        var d2 = p1.y - point.y;
        var d3 = p2.x - point.x;
        var d4 = p2.y - point.y;
        var det = d1*d4 - d2*d3;
        if(Math.abs(det)<.001){
            return 0
        }
        else if(det<0){
            return -1
        }
        else{
            return 1
        }
    },

    compute:function(){
        var ray = new Ray(this.point, 0);
        var initial = this.initialSegments(ray);
        var currentSegments = initial.segments;
        var currentSegment = initial.segment;
        var lastPoint = initial.intersection;
        var lastDistance = initial.distance;
        var poly = new Array();
        poly.push(initial.intersection);
        for(var i=0; i<this.obstPoints.points.length; i++){
            checkPoint = this.obstPoints.points[i];
            ray.angle = checkPoint.angle;
            checkSeg = checkPoint.segment;
            var status = this.updateSegment(currentSegments, checkSeg);
            if(status.delete && currentSegment == checkSeg){
                this.addPoint(checkPoint, lastPoint, poly);
                if(currentSegments['length'] == 0){
                    currentSegment = null;
                    lastPoint = checkPoint;
                    continue;
                }
                var c = this.minSegment(currentSegments, ray);
                console.log(currentSegments)
                var inter = this.intersection(ray, c.segment);
                this.addPoint(inter, checkPoint, poly);
                lastPoint = inter;
                lastDistance = c.distance;
                currentSegment = c.segment;
            }
            else if(!status.delete){
                if(currentSegment == null){
                    currentSegment = checkSeg;
                    this.addPoint(checkPoint, lastPoint, poly);
                    lastPoint = checkPoint;
                    continue;
                }
                var c = this.closer(currentSegment, checkSeg);
                if(c != currentSegment){
                    var inter = this.intersection(ray, currentSegment);
                    this.addPoint(inter, lastPoint, poly);
                    this.addPoint(checkPoint, inter, poly);
                    currentSegment = c;
                    lastPoint = checkPoint;
                }
            }
        }
        this.polyPoints = poly;
    },

    draw:function(context){
        pts = this.polyPoints;
        context.beginPath();
        context.moveTo(pts[0].x, pts[0].y);
        for(var i=1; i<pts.length; i++){
            context.lineTo(pts[i].x, pts[i].y);
        }
        context.fillStyle = "#ffffcc";
        context.fill();
    }
}

function Ray(point, angle){
    this.point = point;
    this.angle = angle;
}

