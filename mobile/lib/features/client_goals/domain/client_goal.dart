import '../../../shared/helpers/json_utils.dart';

class ClientGoal {
  final String description;
  final int? targetCalories;
  final int? targetProtein;

  const ClientGoal({
    required this.description,
    this.targetCalories,
    this.targetProtein,
  });

  factory ClientGoal.fromJson(Map<String, dynamic> json) => ClientGoal(
    description: asString(json['description']),
    targetCalories: asIntOrNull(json['targetCalories']),
    targetProtein: asIntOrNull(json['targetProtein']),
  );
}

class PtClient {
  final String id;
  final String name;
  final String email;
  final String? photoUrl;
  final int totalSessions;
  final int completedSessions;
  final double progress;
  final bool isActive;
  final ClientGoal? goal;
  /// Paket tujuan dari booking terbaru klien.
  final String goalType;

  const PtClient({
    required this.id,
    required this.name,
    required this.email,
    required this.photoUrl,
    required this.totalSessions,
    required this.completedSessions,
    required this.progress,
    required this.isActive,
    required this.goal,
    this.goalType = 'GENERAL',
  });

  factory PtClient.fromJson(Map<String, dynamic> json) => PtClient(
    id: asString(json['id']),
    name: asString(json['name']),
    email: asString(json['email']),
    photoUrl: asStringOrNull(json['photoUrl']),
    totalSessions: asInt(json['totalSessions']),
    completedSessions: asInt(json['completedSessions']),
    progress: asDouble(json['progress']).clamp(0.0, 1.0).toDouble(),
    isActive: asBool(json['isActive']),
    goal: json['goal'] is Map ? ClientGoal.fromJson(asMap(json['goal'])) : null,
    goalType: asString(json['goalType'], 'GENERAL'),
  );
}
